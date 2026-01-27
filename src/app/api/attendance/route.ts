import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import SystemSettings from '@/models/SystemSettings';
import { verifyToken } from '@/lib/auth';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const { latitude, longitude, deviceId } = await req.json();

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Invalid location data' },
        { status: 400 }
      );
    }

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required for check-in' },
        { status: 400 }
      );
    }

    // Get the user to check device ID
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check device ID - if user has a saved device ID, it must match
    if (user.deviceId) {
      if (user.deviceId !== deviceId) {
        return NextResponse.json(
          { 
            error: 'Invalid device. You are trying to check in from a different device. Please use the device you registered with.',
            reason: 'DEVICE_MISMATCH'
          },
          { status: 403 }
        );
      }
    } else {
      // First check-in: save the device ID
      user.deviceId = deviceId;
      await user.save();
    }

    const settings = await SystemSettings.findOne();
    if (!settings) {
      return NextResponse.json({ error: 'Office settings not configured' }, { status: 400 });
    }

    // Validate office location is configured
    if (settings.officeLatitude === 0 && settings.officeLongitude === 0) {
      return NextResponse.json(
        { error: 'Office location not configured. Please configure it in settings.' },
        { status: 400 }
      );
    }

    const distance = calculateDistance(
      latitude,
      longitude,
      settings.officeLatitude,
      settings.officeLongitude
    );

    console.log('Attendance Check:', {
      userLocation: { latitude, longitude },
      officeLocation: { 
        latitude: settings.officeLatitude, 
        longitude: settings.officeLongitude 
      },
      distance: Math.round(distance),
      allowedRadius: settings.attendanceRadius,
      withinRadius: distance <= settings.attendanceRadius,
    });

    const withinRadius = distance <= settings.attendanceRadius;

    // Reject if outside allowed radius
    if (!withinRadius) {
      const distanceInKm = (distance / 1000).toFixed(2);
      return NextResponse.json(
        { 
          error: `You are ${Math.round(distance)}m (${distanceInKm}km) away from office. Allowed radius: ${settings.attendanceRadius}m. Please come closer to the office to mark attendance.`,
          distance: Math.round(distance),
          distanceInKm: parseFloat(distanceInKm),
          allowedRadius: settings.attendanceRadius,
          officeLocation: {
            latitude: settings.officeLatitude,
            longitude: settings.officeLongitude,
            name: settings.officeName,
          },
        },
        { status: 400 }
      );
    }

    // Get today's date range (00:00:00 to 23:59:59)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if already marked today
    const existingAttendance = await Attendance.findOne({
      userId: payload.userId,
      date: { $gte: today, $lt: tomorrow },
    });

    if (existingAttendance) {
      return NextResponse.json(
        { 
          error: 'You have already marked attendance today. You can only check in once per day.',
          markedAt: existingAttendance.checkInTime,
        },
        { status: 400 }
      );
    }

    // Calculate if late
    const checkInTime = new Date();
    const [attendanceHours, attendanceMinutes] = settings.attendanceTime.split(':').map(Number);
    const attendanceDeadline = new Date();
    attendanceDeadline.setHours(attendanceHours, attendanceMinutes, 0, 0);

    const isLate = checkInTime > attendanceDeadline;
    const lateMinutes = isLate 
      ? Math.floor((checkInTime.getTime() - attendanceDeadline.getTime()) / (1000 * 60))
      : 0;

    // Create new attendance record
    const attendance = await Attendance.create({
      userId: payload.userId,
      date: today,
      checkInTime,
      latitude,
      longitude,
      withinRadius: true, // Already verified above
      isLate,
      lateMinutes,
      deviceId, // Save the device ID used for check-in
    });

    return NextResponse.json({
      attendance,
      withinRadius: true,
      distance: Math.round(distance),
      allowedRadius: settings.attendanceRadius,
      isLate,
      lateMinutes,
      message: isLate 
        ? `Checked in late by ${lateMinutes} minutes`
        : 'Checked in on time',
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    return NextResponse.json({ error: 'Failed to mark attendance' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    await connectDB();

    const userId = req.nextUrl.searchParams.get('userId') || payload.userId;
    const month = req.nextUrl.searchParams.get('month');

    let query: any = { userId };

    if (month) {
      const [year, monthNum] = month.split('-');
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendances = await Attendance.find(query).sort({ date: -1 });

    return NextResponse.json({ attendances });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}
