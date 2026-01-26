import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
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

    const { latitude, longitude } = await req.json();

    const settings = await SystemSettings.findOne();
    if (!settings) {
      return NextResponse.json({ error: 'Office settings not configured' }, { status: 400 });
    }

    const distance = calculateDistance(
      latitude,
      longitude,
      settings.officeLatitude,
      settings.officeLongitude
    );

    const withinRadius = distance <= settings.attendanceRadius;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already marked today
    let attendance = await Attendance.findOne({
      userId: payload.userId,
      date: today,
    });

    if (attendance) {
      // Update checkout
      attendance.checkOutTime = new Date();
      await attendance.save();
    } else {
      // Create new attendance
      attendance = await Attendance.create({
        userId: payload.userId,
        date: today,
        checkInTime: new Date(),
        latitude,
        longitude,
        withinRadius,
      });
    }

    return NextResponse.json({
      attendance,
      withinRadius,
      distance: Math.round(distance),
      allowedRadius: settings.attendanceRadius,
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
