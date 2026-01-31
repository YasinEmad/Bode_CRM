import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Commission from '@/models/Commission';
import Lead from '@/models/Lead';
import { verifyToken } from '@/lib/auth';

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

    const { status, rejectionReason, rejectionNote, amount } = await req.json();

    const updateFields: any = {
      status,
      approvedBy: status === 'approved' ? payload.userId : undefined,
      approvalDate: status === 'approved' ? new Date() : undefined,
      rejectionReason: status === 'rejected' ? rejectionReason : undefined,
      rejectionNote: status === 'rejected' ? rejectionNote : undefined,
    };

    // Allow admin to set amount when approving or updating
    if (amount !== undefined && amount !== null && !isNaN(Number(amount))) {
      updateFields.amount = Number(amount);
    }

    const commission = await Commission.findByIdAndUpdate(id, updateFields, { new: true })
      .populate('dealId', 'name project proofImage notes')
      .populate('employeeId', 'name');

    if (!commission) {
      return NextResponse.json({ error: 'Commission not found' }, { status: 404 });
    }

    // If admin approved the commission, also mark the related Lead as closed
    if (status === 'approved' && commission.dealId) {
      try {
        await Lead.findByIdAndUpdate(commission.dealId._id || commission.dealId, { status: 'closed' });
      } catch (err) {
        console.error('Failed to update lead status after commission approval:', err);
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

    return NextResponse.json({ message: 'Commission deleted', commission });
  } catch (error) {
    console.error('Error deleting commission:', error);
    return NextResponse.json({ error: 'Failed to delete commission' }, { status: 500 });
  }
}
