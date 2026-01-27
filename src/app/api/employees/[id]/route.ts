import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Lead from '@/models/Lead';
import SystemSettings from '@/models/SystemSettings';
import Commission from '@/models/Commission';
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
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    const { position, name, email, phone, salary } = body;
    const { id } = await params;

    const updateData: any = {};
    if (position !== undefined) updateData.position = position;
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (salary !== undefined) updateData.salary = Number(salary);

    console.log('Update data:', updateData);

    const employee = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('_id name email phone position salary createdAt');

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    console.log('Updated employee:', employee.toObject());

    // If position was changed, apply commission rules to pending commissions
    if (position !== undefined) {
      const systemSettings = await SystemSettings.findOne();
      if (systemSettings && systemSettings.commissionRules && systemSettings.commissionRules.length > 0) {
        const commissionRule = systemSettings.commissionRules.find(
          (rule: any) => (rule.position || '').toLowerCase() === (position || '').toLowerCase()
        );

        if (commissionRule) {
          // Find all pending commissions for this employee
          const pendingCommissions = await Commission.find({
            employeeId: id,
            status: 'pending'
          }).populate('dealId');

          // Update each pending commission with the new commission percentage
          for (const commission of pendingCommissions) {
            const dealAmount = (commission.dealId as any).budget || 0;
            const newAmount = (dealAmount * commissionRule.percentage) / 100;
            
            await Commission.findByIdAndUpdate(
              commission._id,
              {
                percentage: commissionRule.percentage,
                amount: newAmount
              }
            );
          }

          console.log(`Updated ${pendingCommissions.length} pending commissions for employee ${id} with position ${position}`);
        }
      }
    }

    // Get leads and deals stats
    const leadsCount = await Lead.countDocuments({ assignedTo: id });
    const closedDealsCount = await Lead.countDocuments({ 
      assignedTo: id,
      status: 'closed'
    });

    const employeeData = {
      ...employee.toObject(),
      leadsCount,
      closedDealsCount,
    };

    return NextResponse.json({ employee: employeeData });
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}
