import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import SystemSettings from '@/models/SystemSettings';
import { verifyToken } from '@/lib/auth';
import { compareDeviceIds } from '@/lib/deviceId';

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
    // التحقق من جهاز الموظف
    if (user.deviceId) {
      // جهاز مسجل مسبقاً - قارن البصمات
      if (!compareDeviceIds(user.deviceId, deviceId)) {
        return NextResponse.json(
          { 
            error: 'Device mismatch detected. You registered with a different device. Please contact your admin to update your device ID.',
            reason: 'DEVICE_MISMATCH',
            registeredDevice: user.deviceId.substring(0, 10) + '...',
            currentDevice: deviceId.substring(0, 10) + '...',
          },
          { status: 403 }
        );
      }
      // البصمات متطابقة - السماح بالحضور
    } else {
      // أول مرة - احفظ البصمة الجديدة في قاعدة البيانات
      user.deviceId = deviceId;
      await user.save();
      console.log(`Device registered for user ${user.name}: ${deviceId.substring(0, 15)}...`);
    }

    const settings = await SystemSettings.findOne();
    if (!settings) {
      return NextResponse.json({ error: 'Office settings not configured' }, { status: 400 });
    }

    // Validate attendance time is set
    if (!settings.attendanceTime) {
      console.error('attendanceTime is not set in settings!');
      return NextResponse.json({ 
        error: 'Shift start time not configured. Admin must set the shift start time in settings.',
      }, { status: 400 });
    }

    // Get shift duration (default 9 hours)
    const shiftDuration = settings.shiftDuration || 9;

    console.log('Settings loaded:', {
      shiftStartTime: settings.attendanceTime,
      shiftDuration: shiftDuration,
      attendanceRadius: settings.attendanceRadius,
      officeLocation: {
        lat: settings.officeLatitude,
        lon: settings.officeLongitude,
      },
    });

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

    // Calculate if late based ONLY on the time set by admin
    // Ignore the date/calendar day - only compare the time of day
    const checkInTime = new Date();
    
    // Parse shift start time safely with trimming
    let shiftStartHours = 18;  // Default 6 PM
    let shiftStartMinutes = 0;
    
    if (settings.attendanceTime && typeof settings.attendanceTime === 'string') {
      const timeStr = settings.attendanceTime.trim();
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        shiftStartHours = parseInt(parts[0], 10);
        shiftStartMinutes = parseInt(parts[1], 10);
      }
    }

    // Validate parsed values
    if (isNaN(shiftStartHours) || isNaN(shiftStartMinutes)) {
      shiftStartHours = 18;
      shiftStartMinutes = 0;
    }

    // Ensure hours and minutes are in valid range
    shiftStartHours = Math.max(0, Math.min(23, shiftStartHours));
    shiftStartMinutes = Math.max(0, Math.min(59, shiftStartMinutes));

    // Determine if check-in is within valid shift time or after shift ends
    let isLate = false;
    let lateMinutes = 0;
    let lateHours = 0;

    // Calculate shift boundaries in minutes
    const shiftStartTimeInMinutes = shiftStartHours * 60 + shiftStartMinutes;
    const shiftDurationInMinutes = shiftDuration * 60;
    
    // Get current time in minutes from start of day
    const currentTimeInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
    
    // Case 1: Shift does NOT wrap around midnight (e.g., 9 AM - 5 PM)
    if (shiftStartTimeInMinutes + shiftDurationInMinutes <= 24 * 60) {
      const shiftEndTimeInMinutes = shiftStartTimeInMinutes + shiftDurationInMinutes;
      
      if (currentTimeInMinutes < shiftStartTimeInMinutes) {
        // Before shift starts - this is late from PREVIOUS day's shift
        return NextResponse.json(
          {
            error: 'الشفت خلص - لا يمكن تسجيل الحضور بعد انتهاء الشفت',
            reason: 'SHIFT_ENDED',
            shiftStartTime: `${String(shiftStartHours).padStart(2, '0')}:${String(shiftStartMinutes).padStart(2, '0')}`,
            shiftEndTime: `${String(Math.floor(shiftEndTimeInMinutes / 60)).padStart(2, '0')}:${String(shiftEndTimeInMinutes % 60).padStart(2, '0')}`,
          },
          { status: 400 }
        );
      } else if (currentTimeInMinutes >= shiftEndTimeInMinutes) {
        // After shift ends
        return NextResponse.json(
          {
            error: 'الشفت خلص - لا يمكن تسجيل الحضور بعد انتهاء الشفت',
            reason: 'SHIFT_ENDED',
            shiftStartTime: `${String(shiftStartHours).padStart(2, '0')}:${String(shiftStartMinutes).padStart(2, '0')}`,
            shiftEndTime: `${String(Math.floor(shiftEndTimeInMinutes / 60)).padStart(2, '0')}:${String(shiftEndTimeInMinutes % 60).padStart(2, '0')}`,
          },
          { status: 400 }
        );
      } else {
        // Within valid shift time
        const minutesAfterStart = currentTimeInMinutes - shiftStartTimeInMinutes;
        if (minutesAfterStart > 0) {
          isLate = true;
          lateMinutes = minutesAfterStart;
          lateHours = Math.floor(lateMinutes / 60);
          lateMinutes = lateMinutes % 60;
        }
      }
    } else {
      // Case 2: Shift WRAPS around midnight (e.g., 6 PM - 3 AM next day)
      // Shift period: from shiftStartTime until next day
      
      if (currentTimeInMinutes >= shiftStartTimeInMinutes) {
        // Between shift start and midnight - definitely on time or late for current shift
        const minutesAfterStart = currentTimeInMinutes - shiftStartTimeInMinutes;
        if (minutesAfterStart > 0) {
          isLate = true;
          lateMinutes = minutesAfterStart;
          lateHours = Math.floor(lateMinutes / 60);
          lateMinutes = lateMinutes % 60;
        }
      } else {
        // Before shift start (early morning)
        // This could be part of current shift (if it wraps to this morning) or past shift
        const shiftEndTimeActual = (shiftStartTimeInMinutes + shiftDurationInMinutes) % (24 * 60);
        
        if (currentTimeInMinutes < shiftEndTimeActual) {
          // Still within shift that started yesterday
          const minutesAfterStart = currentTimeInMinutes + (24 * 60) - shiftStartTimeInMinutes;
          isLate = true;
          lateMinutes = minutesAfterStart;
          lateHours = Math.floor(lateMinutes / 60);
          lateMinutes = lateMinutes % 60;
        } else {
          // Past the shift - REJECT
          return NextResponse.json(
            {
              error: 'الشفت خلص - لا يمكن تسجيل الحضور بعد انتهاء الشفت',
              reason: 'SHIFT_ENDED',
              shiftStartTime: `${String(shiftStartHours).padStart(2, '0')}:${String(shiftStartMinutes).padStart(2, '0')}`,
              shiftEndTime: `${String(Math.floor(shiftEndTimeActual / 60)).padStart(2, '0')}:${String(shiftEndTimeActual % 60).padStart(2, '0')}`,
            },
            { status: 400 }
          );
        }
      }
    }

    console.log('=== SHIFT CHECK-IN DEBUG ===');
    console.log('User:', user.name);
    console.log('Check-in Time:', checkInTime.toISOString(), `Local: ${checkInTime.toLocaleString()}`);
    console.log('Shift Start Time:', `${String(shiftStartHours).padStart(2, '0')}:${String(shiftStartMinutes).padStart(2, '0')}`);
    console.log('Shift Duration:', `${shiftDuration} hours`);
    console.log('Current Time (minutes):', currentTimeInMinutes);
    console.log('Shift Start (minutes):', shiftStartTimeInMinutes);
    console.log('Is Late:', isLate);
    console.log('Late Hours:', lateHours, 'Minutes:', lateMinutes);
    console.log('=== END DEBUG ===');

    // Determine which shift date this belongs to
    // If check-in is BEFORE shift start AND we're in the early morning hours
    // then it's for the PREVIOUS day's shift (that runs late into the night)
    let shiftDate = new Date(today);
    
    if (currentTimeInMinutes < shiftStartTimeInMinutes && shiftStartTimeInMinutes + shiftDurationInMinutes > 24 * 60) {
      // Early morning, and shift wraps around midnight
      shiftDate.setDate(shiftDate.getDate() - 1);
    }

    // Check if already marked for this shift
    const shiftDateStart = new Date(shiftDate);
    shiftDateStart.setHours(0, 0, 0, 0);
    const shiftDateEnd = new Date(shiftDateStart);
    shiftDateEnd.setDate(shiftDateEnd.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      userId: payload.userId,
      date: { $gte: shiftDateStart, $lt: shiftDateEnd },
    });

    if (existingAttendance) {
      return NextResponse.json(
        { 
          error: 'You have already marked attendance for this shift. You can only check in once per shift.',
          markedAt: existingAttendance.checkInTime,
          shiftStartTime: `${String(shiftStartHours).padStart(2, '0')}:${String(shiftStartMinutes).padStart(2, '0')}`,
        },
        { status: 400 }
      );
    }

    // Create new attendance record
    const attendance = await Attendance.create({
      userId: payload.userId,
      date: shiftDate,
      checkInTime,
      latitude,
      longitude,
      withinRadius: true, // Already verified above
      isLate,
      lateMinutes: (lateHours * 60) + lateMinutes,
      deviceId, // Save the device ID used for check-in
    });

    // Fetch the record back to confirm what was saved
    const savedRecord = await Attendance.findById(attendance._id);
    console.log('🔍 SAVED RECORD IN DB:', {
      _id: savedRecord?._id,
      userId: savedRecord?.userId,
      date: savedRecord?.date,
      checkInTime: savedRecord?.checkInTime,
      isLate: savedRecord?.isLate,
      lateMinutes: savedRecord?.lateMinutes,
      deviceId: savedRecord?.deviceId,
    });

    // Format the late time message
    let message = 'تم تسجيل الحضور في الوقت المحدد';
    if (savedRecord?.isLate) {
      const hours = Math.floor((savedRecord?.lateMinutes || 0) / 60);
      const minutes = (savedRecord?.lateMinutes || 0) % 60;
      if (hours > 0 && minutes > 0) {
        message = `تأخرت ${hours} ساعة و ${minutes} دقيقة`;
      } else if (hours > 0) {
        message = `تأخرت ${hours} ساعة`;
      } else if (minutes > 0) {
        message = `تأخرت ${minutes} دقيقة`;
      }
    }

    const responseData = {
      attendance: savedRecord,
      withinRadius: true,
      distance: Math.round(distance),
      allowedRadius: settings.attendanceRadius,
      isLate: savedRecord?.isLate,
      lateMinutes: savedRecord?.lateMinutes,
      shiftStartTime: `${String(shiftStartHours).padStart(2, '0')}:${String(shiftStartMinutes).padStart(2, '0')}`,
      shiftDuration: `${shiftDuration} hours`,
      message: message,
    };

    console.log('=== RETURNING RESPONSE ===');
    console.log('Response Data:', JSON.stringify(responseData, null, 2));
    console.log('=== END RESPONSE ===');

    return NextResponse.json(responseData);
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

    console.log('🔍 GET ATTENDANCE - FETCHING:', {
      userId,
      month,
      recordCount: attendances.length,
    });
    
    if (attendances.length > 0) {
      console.log('🔍 FIRST RECORD RETURNED:', {
        _id: attendances[0]._id,
        date: attendances[0].date,
        checkInTime: attendances[0].checkInTime,
        isLate: attendances[0].isLate,
        lateMinutes: attendances[0].lateMinutes,
        deviceId: attendances[0].deviceId,
      });
    }

    return NextResponse.json({ attendances });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}
