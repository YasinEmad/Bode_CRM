import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Commission from '@/models/Commission';
import User from '@/models/User';
import SystemSettings from '@/models/SystemSettings';
import { verifyToken } from '@/lib/auth';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function POST(req: NextRequest) {
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

    // Get all pending commissions
    const pendingCommissions = await Commission.find({
      status: 'pending',
    }).populate('employeeId').populate('dealId');

    // Get system settings
    const settings = await SystemSettings.findOne();

    let updatedCount = 0;

    // Recalculate each commission based on current employee position
    for (const commission of pendingCommissions) {
      const employee = commission.employeeId as any;
      const deal = commission.dealId as any;

      if (!employee?.position || !settings?.commissionRules) {
        continue;
      }

      // Find rule for current position
      const rule = settings.commissionRules.find(
        (r: any) => (r.position || '').toLowerCase() === (employee.position || '').toLowerCase()
      );

      if (rule) {
        const newPercentage = rule.percentage;
        const newAmount = (deal.budget || 0) * (newPercentage / 100);

        await Commission.findByIdAndUpdate(commission._id, {
          percentage: newPercentage,
          amount: newAmount,
        });

        updatedCount++;
      }
    }

    return NextResponse.json({
      message: `Recalculated ${updatedCount} pending commissions based on current position rules`,
      updatedCount,
    });
  } catch (error) {
    console.error('Error recalculating commissions:', error);
    return NextResponse.json({ error: 'Failed to recalculate commissions' }, { status: 500 });
  }
}
