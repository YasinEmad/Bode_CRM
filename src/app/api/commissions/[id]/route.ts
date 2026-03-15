import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Commission from '@/models/Commission';
import ClosedDealSnapshot from '@/models/ClosedDealSnapshot';
import Lead from '@/models/Lead';
import DealClosing from '@/models/DealClosing';
import { verifyToken } from '@/lib/auth';
import { logAdminAction } from '@/lib/adminLogger';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    const { status, rejectionReason, rejectionNote, amount, recipients } = await req.json();

    const updateFields: any = {
      status,
      approvedBy: status === 'approved' ? payload.userId : undefined,
      approvalDate: status === 'approved' ? new Date() : undefined,
      rejectionReason: status === 'rejected' ? rejectionReason : undefined,
      rejectionNote: status === 'rejected' ? rejectionNote : undefined,
    };

    // If recipients provided, validate and update them and compute total amount
    if (Array.isArray(recipients) && recipients.length > 0) {
      const seen = new Set();
      const recipientsToSave: any[] = [];
      for (const r of recipients) {
        if (!r.userId) return NextResponse.json({ error: 'Each recipient must include userId' }, { status: 400 });
        if (seen.has(String(r.userId))) return NextResponse.json({ error: 'Duplicate recipient userId' }, { status: 400 });
        seen.add(String(r.userId));
        recipientsToSave.push({ userId: r.userId, role: r.role || 'sales', amount: Number(r.amount || 0), percentage: r.percentage });
      }
      updateFields.recipients = recipientsToSave;
      updateFields.employeeId = recipientsToSave.length > 0 ? recipientsToSave[0].userId : null;
      updateFields.amount = recipientsToSave.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    } else if (amount !== undefined && amount !== null && !isNaN(Number(amount))) {
      updateFields.amount = Number(amount);
    }

    const commission = await Commission.findByIdAndUpdate(id, updateFields, { new: true })
      .populate('dealId', 'name project proofImage notes')
      .populate('recipients.userId', 'name position')
      .populate('employeeId', 'name');

    if (!commission) {
      return NextResponse.json({ error: 'Commission not found' }, { status: 404 });
    }

    // Log the admin action
    const recipientsLogged = (commission as any).recipients || [];
    const employeeName = recipientsLogged.map((r: any) => r.userId?.name || 'Unknown').join(', ');
    await logAdminAction({
      adminId: payload.userId,
      action: status === 'approved' ? 'approve' : 'reject',
      resourceType: 'commission',
      resourceId: commission._id,
      resourceName: `Commission for ${employeeName}`,
      description: `${status === 'approved' ? 'Approved' : 'Rejected'} commission for ${employeeName}. Amount: ${commission.amount}. ${status === 'rejected' ? `Reason: ${rejectionReason}` : ''}`,
      details: {
        commissionId: commission._id,
        recipients: recipientsLogged.map((r: any) => ({ userId: r.userId, amount: r.amount })),
        amount: commission.amount,
        status,
        rejectionReason: status === 'rejected' ? rejectionReason : undefined,
      },
    });

    // If admin approved or rejected the commission, find the related DealClosing to update the original Lead status
    if (commission.dealId) {
      try {
        const dealClosingId = (commission.dealId as any)._id || commission.dealId;
        const dealClosing = await DealClosing.findById(dealClosingId).populate('leadId');
        if (dealClosing && (dealClosing as any).leadId) {
          const leadId = (dealClosing as any).leadId._id || (dealClosing as any).leadId;
          if (status === 'approved') {
            await Lead.findByIdAndUpdate(leadId, { status: 'closed' });
          } else if (status === 'rejected') {
            await Lead.findByIdAndUpdate(leadId, { status: 'rejected' });
          }
        }
      } catch (err) {
        console.error('Failed to update lead status after commission status change:', err);
      }
    }

    return NextResponse.json({ commission });
  } catch (error) {
    console.error('Error updating commission:', error);
    return NextResponse.json({ error: 'Failed to update commission' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    const commission = await Commission.findByIdAndDelete(id)
      .populate('dealId', 'name project proofImage notes')
      .populate('employeeId', 'name');

    if (!commission) {
      return NextResponse.json({ error: 'Commission not found' }, { status: 404 });
    }

    // Delete associated ClosedDealSnapshot
    try {
      await ClosedDealSnapshot.findOneAndDelete({ commissionId: id });
    } catch (err) {
      console.error('Failed to delete associated ClosedDealSnapshot:', err);
      // Continue with commission deletion even if snapshot deletion fails
    }

    // Log the admin action
    const employee = (commission as any).employeeId;
    const employeeName = employee?.name || 'Unknown Employee';
    await logAdminAction({
      adminId: payload.userId,
      action: 'delete',
      resourceType: 'commission',
      resourceId: id,
      resourceName: `Commission for ${employeeName}`,
      description: `Deleted commission for ${employeeName}. Amount was: ${commission.amount}`,
      details: {
        commissionId: commission._id,
        employeeId: commission.employeeId,
        amount: commission.amount,
      },
    });

    return NextResponse.json({ message: 'Commission deleted', commission });
  } catch (error) {
    console.error('Error deleting commission:', error);
    return NextResponse.json({ error: 'Failed to delete commission' }, { status: 500 });
  }
}
