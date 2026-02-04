import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Lead from '@/models/Lead';
import Commission from '@/models/Commission';
import User from '@/models/User';
import SystemSettings from '@/models/SystemSettings';
import Notification from '@/models/Notification';
import { verifyToken } from '@/lib/auth';
import { logAdminAction } from '@/lib/adminLogger';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function PUT(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    const { leadIds, employeeId } = await req.json();

    if (!Array.isArray(leadIds) || leadIds.length === 0 || employeeId === undefined || employeeId === null) {
      return NextResponse.json(
        { error: 'leadIds array and employeeId are required' },
        { status: 400 }
      );
    }

    // Update leads with new assignment
    const result = await Lead.updateMany(
      { _id: { $in: leadIds } },
      { assignedTo: employeeId || null }
    );

    // Log admin action
    const employee = employeeId ? await User.findById(employeeId) : null;
    const assignedLeads = await Lead.find({ _id: { $in: leadIds } });
    
    await logAdminAction({
      adminId: payload.userId,
      action: 'bulk-assign',
      resourceType: 'leads',
      resourceId: null,
      resourceName: `Bulk assigned ${leadIds.length} leads`,
      description: `Assigned ${leadIds.length} leads to ${employee?.name || 'unassigned'}`,
      details: {
        leadCount: leadIds.length,
        leadIds: leadIds,
        leadNames: assignedLeads.map(l => l.name),
        assignedTo: employeeId,
        employeeName: employee?.name || 'unassigned',
      },
    });

    // إنشاء إشعارات للموظف الذي تم إسناد الـ leads له
    if (employeeId) {
      const employee = await User.findById(employeeId);
      if (employee) {
        const leads = await Lead.find({ _id: { $in: leadIds } }).limit(5); // عرض أول 5 leads كمثال
        
        // إنشاء إشعار واحد لكل lead أو إشعار واحد عام إذا كانت العدد كبيراً
        if (leadIds.length <= 5) {
          for (const lead of leads) {
            await Notification.create({
              userId: employeeId,
              type: 'new_lead',
              title: 'New Lead',
              message: `A new lead has been assigned to you: ${lead.name}`,
              leadId: lead._id,
              fromUser: payload.userId,
            });
          }
        } else {
          // إشعار واحد عام عن عدد الـ leads
          await Notification.create({
            userId: employeeId,
            type: 'new_lead',
            title: 'Multiple New Leads',
            message: `${leadIds.length} new leads have been assigned to you`,
            leadId: leads[0]?._id || leadIds[0],
            fromUser: payload.userId,
          });
        }
      }
    }

    // Do not auto-create commissions when assigning leads. Admin must set commission values manually.

    return NextResponse.json(
      {
        message: `Successfully assigned ${result.modifiedCount} leads`,
        modifiedCount: result.modifiedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error assigning leads:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to assign leads' },
      { status: 500 }
    );
  }
}
