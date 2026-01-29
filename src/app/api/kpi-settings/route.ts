import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import KPISetting from '@/models/KPISetting';
import { verifyToken } from '@/lib/auth';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function GET(req: NextRequest) {
  try {
    console.log('🔵 GET /api/kpi-settings - Starting');
    const token = extractToken(req);
    console.log('Token extracted:', !!token);
    
    if (!token) {
      console.log('❌ No token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    console.log('Token verified:', !!payload, 'Role:', payload?.role);
    if (!payload) {
      console.log('❌ Token verification failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow admin and any other authenticated user to view KPI settings
    // (restriction is only on PUT for admin to modify)

    console.log('🔵 Connecting to DB...');
    await connectDB();
    console.log('✅ Connected to DB');

    console.log('🔵 Finding KPI settings...');
    let kpiSettings = await KPISetting.findOne();
    console.log('Found existing:', !!kpiSettings);

    // If no settings exist, create default ones
    if (!kpiSettings) {
      console.log('🔵 Creating default KPI settings...');
      kpiSettings = await KPISetting.create({
        indicators: [
          { name: 'attendance', target: 95, weight: 12.5 },
          { name: 'deals', target: 2, weight: 50 },
          { name: 'calls', target: 20, weight: 12.5 },
          { name: 'meetings', target: 5, weight: 12.5 },
          { name: 'assessments', target: 3, weight: 12.5 },
        ],
      });
      console.log('✅ Created default settings');
    }

    console.log('✅ Returning KPI settings');
    return NextResponse.json({ kpiSettings });
  } catch (error) {
    console.error('❌ Error fetching KPI settings:', error);
    return NextResponse.json({ error: 'Failed to fetch KPI settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    console.log('🟡 PUT /api/kpi-settings - Starting');
    const token = extractToken(req);
    if (!token) {
      console.log('❌ No token provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      console.log('❌ Admin access required');
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    console.log('🟡 Connecting to DB...');
    await connectDB();
    console.log('✅ Connected to DB');

    console.log('🟡 Parsing request body...');
    const { indicators } = await req.json();
    console.log('📦 Indicators received:', indicators);

    // Validate indicators
    if (!Array.isArray(indicators) || indicators.length === 0) {
      console.log('❌ Indicators array is required');
      return NextResponse.json({ error: 'Indicators array is required' }, { status: 400 });
    }

    // Check if all required indicators are present
    const requiredIndicators = ['attendance', 'deals', 'calls', 'meetings', 'assessments'];
    const providedIndicators = indicators.map((ind: any) => ind.name);
    const missingIndicators = requiredIndicators.filter((ind) => !providedIndicators.includes(ind));

    if (missingIndicators.length > 0) {
      console.log('❌ Missing indicators:', missingIndicators);
      return NextResponse.json(
        { error: `Missing required indicators: ${missingIndicators.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate each indicator
    for (const indicator of indicators) {
      if (!indicator.name || !requiredIndicators.includes(indicator.name)) {
        console.log('❌ Invalid indicator name:', indicator.name);
        return NextResponse.json({ error: `Invalid indicator name: ${indicator.name}` }, { status: 400 });
      }

      if (typeof indicator.target !== 'number' || indicator.target <= 0) {
        console.log('❌ Invalid target for', indicator.name);
        return NextResponse.json(
          { error: `Target for ${indicator.name} must be a positive number` },
          { status: 400 }
        );
      }

      if (typeof indicator.weight !== 'number' || indicator.weight < 0 || indicator.weight > 100) {
        console.log('❌ Invalid weight for', indicator.name);
        return NextResponse.json(
          { error: `Weight for ${indicator.name} must be between 0 and 100` },
          { status: 400 }
        );
      }
    }

    // Calculate total weight
    const totalWeight = indicators.reduce((sum: number, ind: any) => sum + ind.weight, 0);

    // Total weight must equal 100
    if (Math.abs(totalWeight - 100) > 0.01) {
      console.log('❌ Invalid total weight:', totalWeight);
      return NextResponse.json(
        { error: `Total weight must equal 100%, current total: ${totalWeight.toFixed(2)}%` },
        { status: 400 }
      );
    }

    console.log('✅ All validations passed');

    // Find and update or create
    console.log('🟡 Finding existing KPI settings...');
    let kpiSettings = await KPISetting.findOne();
    
    if (!kpiSettings) {
      console.log('🟡 Creating new KPI settings...');
      kpiSettings = await KPISetting.create({ indicators });
      console.log('✅ New KPI settings created with ID:', kpiSettings._id);
    } else {
      console.log('🟡 Updating existing KPI settings...');
      console.log('   Current ID:', kpiSettings._id);
      kpiSettings.indicators = indicators;
    }

    // Set total weight
    kpiSettings.totalWeight = totalWeight;
    
    console.log('🟡 Saving to database...');
    console.log('   Indicators to save:', indicators.length);
    console.log('   Total weight:', totalWeight.toFixed(2) + '%');
    
    await kpiSettings.save();
    
    console.log('✅ Successfully saved KPI settings');
    console.log('   ID:', kpiSettings._id);
    console.log('   Indicators saved:', kpiSettings.indicators.length);
    
    // Verify saved data
    console.log('🟡 Verifying saved data...');
    const verifySettings = await KPISetting.findOne();
    if (verifySettings) {
      console.log('✅ Verification successful');
      console.log('   - Indicators in DB:', verifySettings.indicators.length);
      console.log('   - Total weight in DB:', verifySettings.totalWeight);
      console.log('   - Indicator names:', verifySettings.indicators.map((ind: any) => ind.name).join(', '));
    } else {
      console.error('❌ Verification failed - no settings found in DB');
    }

    return NextResponse.json({ kpiSettings, message: 'KPI settings updated successfully' });
  } catch (error) {
    console.error('❌ Error updating KPI settings:', error);
    return NextResponse.json({ error: 'Failed to update KPI settings' }, { status: 500 });
  }
}
