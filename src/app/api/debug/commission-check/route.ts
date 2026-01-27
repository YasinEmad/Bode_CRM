import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import SystemSettings from '@/models/SystemSettings';
import Commission from '@/models/Commission';
import { verifyToken } from '@/lib/auth';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function GET(req: NextRequest) {
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

    // Get all employees
    const employees = await User.find({ role: 'sales' }).select('name email position salary');
    
    // Get system settings
    const settings = await SystemSettings.findOne();

    // Get commission statistics
    const commissionStats = await Commission.aggregate([
      {
        $group: {
          _id: '$percentage',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Check which employees have positions set
    const employeesWithoutPosition = employees.filter(e => !e.position || e.position === '');
    const employeesWithPosition = employees.filter(e => e.position && e.position !== '');

    // Validate rules
    const rules = settings?.commissionRules || [];
    const rulesValidation = {
      totalRules: rules.length,
      rulesWithPercentage: rules.filter((r: any) => r.percentage > 0).length,
      rules: rules.map((r: any) => ({
        position: r.position,
        percentage: r.percentage,
        normalized: (r.position || '').toLowerCase().trim(),
      })),
    };

    // Check matches
    const matches = employeesWithPosition.map((emp: any) => {
      const normalized = (emp.position || '').toLowerCase().trim();
      const rule = rules.find((r: any) => (r.position || '').toLowerCase().trim() === normalized);
      return {
        employeeName: emp.name,
        position: emp.position,
        normalizedPosition: normalized,
        hasRule: !!rule,
        rulePercentage: rule?.percentage || null,
        appliedPercentage: rule && rule.percentage > 0 ? rule.percentage : 5,
      };
    });

    return NextResponse.json({
      debug: {
        timestamp: new Date().toISOString(),
        totalEmployees: employees.length,
        employeesWithPosition: employeesWithPosition.length,
        employeesWithoutPosition: employeesWithoutPosition.length,
        missingPositions: employeesWithoutPosition.map(e => ({ name: e.name, email: e.email })),
      },
      rules: rulesValidation,
      commissions: {
        totalCommissions: await Commission.countDocuments(),
        byPercentage: commissionStats,
      },
      matches: matches,
      recommendations: [
        employeesWithoutPosition.length > 0 ? `⚠️ ${employeesWithoutPosition.length} employees have no position set` : '✅ All employees have positions',
        rules.length === 0 ? '⚠️ No commission rules configured' : `✅ ${rules.length} commission rules configured`,
        rules.filter((r: any) => r.percentage === 0).length > 0 ? '⚠️ Some rules have 0% percentage' : '✅ All rules have percentage > 0',
        matches.filter((m: any) => !m.hasRule).length > 0 ? `⚠️ ${matches.filter((m: any) => !m.hasRule).length} employees have positions but no matching rules` : '✅ All employee positions have matching rules',
      ],
    });
  } catch (error) {
    console.error('Error in commission check:', error);
    return NextResponse.json({ error: 'Failed to check commissions' }, { status: 500 });
  }
}
