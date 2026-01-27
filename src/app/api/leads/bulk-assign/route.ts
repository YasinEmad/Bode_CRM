import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Lead from '@/models/Lead';
import Commission from '@/models/Commission';
import User from '@/models/User';
import SystemSettings from '@/models/SystemSettings';
import { verifyToken } from '@/lib/auth';

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

    // If employeeId is set, get the employee and settings to determine commission percentage
    if (employeeId) {
      const employee = await User.findById(employeeId);
      const settings = await SystemSettings.findOne();
      
      let commissionPercentage = 5; // default fallback
      
      console.log(`[BulkAssign] Assigning ${leadIds.length} leads to ${employee?.name} (position: ${employee?.position})`);
      console.log(`[BulkAssign] Available commission rules:`, settings?.commissionRules);
      
      if (employee?.position && settings?.commissionRules && settings.commissionRules.length > 0) {
        const normalizedPosition = (employee.position || '').toLowerCase().trim();
        const rule = settings.commissionRules.find(
          (r: any) => (r.position || '').toLowerCase().trim() === normalizedPosition
        );
        if (rule && rule.percentage > 0) {
          commissionPercentage = rule.percentage;
          console.log(`[BulkAssign] Using commission rate: ${rule.percentage}%`);
        } else {
          console.log(`[BulkAssign] No matching rule found, using default 5%`);
        }
      } else {
        console.log(`[BulkAssign] No position or rules configured, using default 5%`);
      }

      // Get all the leads that were just assigned and have status "closed"
      const assignedLeads = await Lead.find({
        _id: { $in: leadIds },
        status: 'closed',
      });

      // Create commissions for closed leads that don't have pending/approved commissions
      for (const lead of assignedLeads) {
        const existingCommission = await Commission.findOne({
          dealId: lead._id,
          status: { $in: ['pending', 'approved'] },
        });

        if (!existingCommission) {
          const amount = (lead.budget || 0) * (commissionPercentage / 100);
          await Commission.create({
            dealId: lead._id,
            employeeId: employeeId,
            amount,
            percentage: commissionPercentage,
            status: 'pending',
          });
        }
      }
    }

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
