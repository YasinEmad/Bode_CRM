import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import SystemSettings from '@/models/SystemSettings';
import { verifyToken } from '@/lib/auth';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    
    // Try to find existing settings
    let settings = await SystemSettings.findOne().lean();
    
    // If not found or labels are missing, ensure defaults
    if (!settings) {
      console.log('📝 Creating new SystemSettings with defaults');
      const defaults = {
        labels: {
          sheets: 'Sheets',
          meetings: 'Meetings',
          assessments: 'Assessments',
          requests: 'Requests',
        }
      };
      settings = await SystemSettings.create(defaults);
      settings = settings.toObject?.() || settings;
    } else if (!settings.labels) {
      console.log('⚠️ Labels missing, initializing defaults');
      await SystemSettings.updateOne(
        { _id: settings._id },
        { $set: { 
          labels: {
            sheets: 'Sheets',
            meetings: 'Meetings',
            assessments: 'Assessments',
            requests: 'Requests',
          }
        }}
      );
      settings = await SystemSettings.findOne().lean();
    }
    
    console.log('🔍 GET /api/system-settings - labels:', settings?.labels);
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    return NextResponse.json({ error: 'Failed to fetch system settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();

    const token = extractToken(req);
    const payload = token ? verifyToken(token) : null;
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { labels } = body;
    console.log('📦 Received labels from request:', labels);

    // Use updateOne to ensure proper saving
    const result = await SystemSettings.updateOne(
      {},
      { $set: { labels } },
      { upsert: true }
    );
    
    console.log('✅ Update result:', result);

    // Fetch fresh from DB using lean to get plain object
    const updated = await SystemSettings.findOne().lean();
    console.log('Final labels in DB:', updated?.labels);
    
    return NextResponse.json({ settings: updated, message: 'System settings updated' });
  } catch (error) {
    console.error('❌ Error updating system settings:', error);
    return NextResponse.json({ error: 'Failed to update system settings' }, { status: 500 });
  }
}
