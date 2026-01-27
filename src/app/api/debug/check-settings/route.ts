import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import SystemSettings from '@/models/SystemSettings';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    let settings = await SystemSettings.findOne();
    
    console.log('=== SETTINGS DEBUG ===');
    console.log('Settings found:', !!settings);
    if (settings) {
      console.log('Full settings:', JSON.stringify(settings, null, 2));
      console.log('attendanceTime value:', settings.attendanceTime);
      console.log('attendanceTime type:', typeof settings.attendanceTime);
      console.log('attendanceTime length:', settings.attendanceTime?.length);
    }

    return NextResponse.json({ 
      settings,
      debug: {
        found: !!settings,
        attendanceTime: settings?.attendanceTime,
        attendanceTimeType: typeof settings?.attendanceTime,
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Debug error' }, { status: 500 });
  }
}
