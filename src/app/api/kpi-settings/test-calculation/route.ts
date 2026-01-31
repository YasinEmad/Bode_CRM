import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import KPISetting from '@/models/KPISetting';
import User from '@/models/User';
import Lead from '@/models/Lead';
import { verifyToken } from '@/lib/auth';
import { calculateEmployeeKPI, EmployeeMetrics } from '@/lib/kpiCalculator';

/**
 * Debug endpoint to test KPI calculation for employees
 * GET /api/kpi-settings/test-calculation
 */
export async function GET(req: NextRequest) {
  try {
    console.log('🔵 GET /api/kpi-settings/test-calculation - Test KPI calculation');
    
    const token = req.headers.get('authorization')?.slice(7);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    console.log('✅ Connected to DB');

    // Fetch KPI settings
    console.log('🟡 Fetching KPI settings...');
    const kpiSettings = await KPISetting.findOne();
    
    if (!kpiSettings) {
      console.log('❌ No KPI settings found');
      return NextResponse.json({
        status: 'error',
        message: 'No KPI settings found in database',
      });
    }

    console.log('✅ KPI settings found with', kpiSettings.indicators.length, 'indicators');

    // Fetch employees
    console.log('🟡 Fetching employees...');
    const employees = await User.find({ role: { $in: ['employee', 'team_member'] } }).lean();
    console.log('✅ Found', employees.length, 'employees');

    // Test calculation for each employee
    const testResults = [];

    for (const emp of employees.slice(0, 3)) { // Test only first 3 employees
      console.log(`\n📊 Testing KPI calculation for ${emp.name}...`);

      // Create test metrics
      const metrics: EmployeeMetrics = {
        attendancePercentage: 85,
        closedDealsCount: 2,
        callsCount: 15,
        meetingsCount: 4,
        assessmentsCount: 2,
        requestsCount: 1,
      };

      console.log('   Test metrics:', metrics);

      try {
        // Calculate KPI
        const kpiScores = calculateEmployeeKPI(metrics, kpiSettings.indicators);
        console.log('   ✅ KPI calculated successfully');
        console.log('   Scores:', kpiScores);

        testResults.push({
          employeeId: emp._id,
          employeeName: emp.name,
          metrics,
          scores: kpiScores,
          status: 'success',
        });
      } catch (error) {
        console.error('   ❌ Error calculating KPI:', error);
        testResults.push({
          employeeId: emp._id,
          employeeName: emp.name,
          metrics,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      status: 'ok',
      message: 'KPI calculation test completed',
      kpiSettingsId: kpiSettings._id,
      indicatorsCount: kpiSettings.indicators.length,
      employeesTested: testResults.length,
      testResults,
    });
  } catch (error) {
    console.error('❌ Error in test calculation:', error);
    return NextResponse.json(
      { error: 'Failed to test KPI calculation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
