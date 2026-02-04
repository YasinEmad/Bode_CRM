import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import SystemSettings from '@/models/SystemSettings';
import { calculateDistance } from '@/lib/geolocation';
import { verifyToken } from '@/lib/auth';
import { logAdminAction } from '@/lib/adminLogger';

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

    const body = await req.json();
    let { officeLatitude, officeLongitude, officeName, attendanceRadius, attendanceTime, commissionRules, minGpsAccuracy } = body;

    // Normalize and validate coordinates to consistent numeric format
    if (officeLatitude !== undefined && officeLatitude !== null) {
      const parsedLat = Number.parseFloat(String(officeLatitude));
      if (Number.isNaN(parsedLat)) {
        return NextResponse.json({ error: 'Invalid office latitude' }, { status: 400 });
      }
      officeLatitude = Number(parsedLat.toFixed(7));
    }

    if (officeLongitude !== undefined && officeLongitude !== null) {
      const parsedLon = Number.parseFloat(String(officeLongitude));
      if (Number.isNaN(parsedLon)) {
        return NextResponse.json({ error: 'Invalid office longitude' }, { status: 400 });
      }
      officeLongitude = Number(parsedLon.toFixed(7));
    }

    // Validate ranges
    if (officeLatitude !== null && officeLatitude !== undefined) {
      if (officeLatitude < -90 || officeLatitude > 90) {
        return NextResponse.json({ error: 'Office latitude out of range (-90 to 90)' }, { status: 400 });
      }
    }
    if (officeLongitude !== null && officeLongitude !== undefined) {
      if (officeLongitude < -180 || officeLongitude > 180) {
        return NextResponse.json({ error: 'Office longitude out of range (-180 to 180)' }, { status: 400 });
      }
    }

    console.log('🔍 API RECEIVED:', {
      officeLatitude,
      officeLongitude,
      types: `${typeof officeLatitude}, ${typeof officeLongitude}`,
      raw_lat: officeLatitude,
      raw_lon: officeLongitude,
    });

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

    console.log('💾 BEFORE DB UPDATE:', {
      new_lat: officeLatitude,
      new_lon: officeLongitude,
    });

    settings.officeLatitude = officeLatitude;
    settings.officeLongitude = officeLongitude;
    settings.officeName = officeName;
    settings.attendanceRadius = Number.parseInt(String(attendanceRadius)) || settings.attendanceRadius || 500;
    settings.attendanceTime = attendanceTime?.trim() || '09:00';
    settings.commissionRules = commissionRules;
    if (minGpsAccuracy !== undefined && minGpsAccuracy !== null) {
      const parsedMin = Number.parseInt(String(minGpsAccuracy));
      if (!Number.isNaN(parsedMin)) settings.minGpsAccuracy = parsedMin;
    }

    await settings.save();

    console.log('✅ AFTER DB SAVE:', {
      saved_lat: settings.officeLatitude,
      saved_lon: settings.officeLongitude,
    });

    // Log the admin action
    const changedFields: Record<string, any> = {};
    if (officeLatitude !== undefined && officeLatitude !== null) changedFields.officeLatitude = officeLatitude;
    if (officeLongitude !== undefined && officeLongitude !== null) changedFields.officeLongitude = officeLongitude;
    if (officeName !== undefined && officeName !== null) changedFields.officeName = officeName;
    if (attendanceRadius !== undefined && attendanceRadius !== null) changedFields.attendanceRadius = attendanceRadius;
    if (attendanceTime !== undefined && attendanceTime !== null) changedFields.attendanceTime = attendanceTime;
    if (commissionRules !== undefined && commissionRules !== null) changedFields.commissionRules = commissionRules;
    if (minGpsAccuracy !== undefined && minGpsAccuracy !== null) changedFields.minGpsAccuracy = minGpsAccuracy;

    await logAdminAction({
      adminId: payload.userId,
      action: 'update',
      resourceType: 'system-settings',
      resourceId: settings._id.toString(),
      resourceName: 'System Settings',
      description: 'Updated system settings',
      details: changedFields,
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
