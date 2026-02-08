import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import KPISetting from '@/models/KPISetting';
import { verifyToken } from '@/lib/auth';

/**
 * Debug endpoint to verify KPI settings
 * GET /api/kpi-settings/verify
 */
export async function GET(req: NextRequest) {
  try {
    console.log('🔵 GET /api/kpi-settings/verify - Debug check');
    
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

    // Check if KPI settings exist
    const kpiSettings = await KPISetting.findOne();
    
    if (!kpiSettings) {
      console.log('⚠️  No KPI settings found in database');
      return NextResponse.json({
        status: 'no_data',
        message: 'No KPI settings found in database',
        recommendation: 'Create default KPI settings first',
      });
    }

    // Validate structure
    const validation = {
      hasId: !!kpiSettings._id,
      hasIndicators: !!kpiSettings.indicators,
      indicatorCount: kpiSettings.indicators?.length || 0,
      totalWeight: kpiSettings.totalWeight,
      createdAt: kpiSettings.createdAt,
      updatedAt: kpiSettings.updatedAt,
    };

    // Check indicators
    const indicatorDetails = kpiSettings.indicators?.map((ind: any) => ({
      name: ind.name,
      target: ind.target,
      weight: ind.weight,
      hasId: !!ind._id,
    })) || [];

    // Calculate sum of weights
    const calculatedWeight = indicatorDetails.reduce((sum: number, ind: any) => sum + ind.weight, 0);

    // Verify all required indicators
    // requests is optional for backward compatibility
    const requiredIndicators = ['attendance', 'deals', 'sheets', 'meetings', 'assessments'];
    const providedIndicators = indicatorDetails.map((ind: any) => ind.name);
    const missingIndicators = requiredIndicators.filter(ind => !providedIndicators.includes(ind));

    console.log('✅ KPI Settings Validation Results:');
    console.log('   - ID:', kpiSettings._id);
    console.log('   - Indicators:', indicatorDetails.length);
    console.log('   - Total Weight (DB):', kpiSettings.totalWeight);
    console.log('   - Total Weight (Calculated):', calculatedWeight);
    console.log('   - Missing Indicators:', missingIndicators.length > 0 ? missingIndicators.join(', ') : 'None');

    return NextResponse.json({
      status: 'ok',
      validation,
      indicators: indicatorDetails,
      weightCheck: {
        dbValue: kpiSettings.totalWeight,
        calculatedValue: calculatedWeight,
        isValid: Math.abs(kpiSettings.totalWeight - 100) < 0.01 && Math.abs(calculatedWeight - 100) < 0.01,
      },
      missingIndicators,
      isComplete: missingIndicators.length === 0 && Math.abs(calculatedWeight - 100) < 0.01,
    });
  } catch (error) {
    console.error('❌ Error verifying KPI settings:', error);
    return NextResponse.json(
      { error: 'Failed to verify KPI settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
