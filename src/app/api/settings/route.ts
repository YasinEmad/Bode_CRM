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
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();

    let settings = await SystemSettings.findOne();
    if (!settings) {
      console.log('Creating default settings with attendanceTime: 09:00');
      settings = await SystemSettings.create({
        officeLatitude: 0,
        officeLongitude: 0,
        officeName: 'Main Office',
        attendanceRadius: 500,
        attendanceTime: '09:00',
        commissionRules: [],
      });
    } else {
      // Ensure attendanceTime is properly formatted
      if (settings.attendanceTime) {
        settings.attendanceTime = settings.attendanceTime.trim();
      }
      console.log('Fetched settings from DB:', {
        attendanceTime: settings.attendanceTime,
        _id: settings._id,
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
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

    const { officeLatitude, officeLongitude, officeName, attendanceRadius, attendanceTime, commissionRules } =
      await req.json();

    // Validate and sanitize attendanceTime
    if (attendanceTime) {
      const trimmedTime = attendanceTime.trim();
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(trimmedTime)) {
        return NextResponse.json(
          { error: 'Invalid time format. Use HH:mm (24-hour format, e.g., 09:00 or 14:30)' },
          { status: 400 }
        );
      }
    }

    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = new SystemSettings();
    }

    settings.officeLatitude = officeLatitude;
    settings.officeLongitude = officeLongitude;
    settings.officeName = officeName;
    settings.attendanceRadius = attendanceRadius;
    settings.attendanceTime = attendanceTime?.trim() || '09:00';
    settings.commissionRules = commissionRules;

    await settings.save();

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
