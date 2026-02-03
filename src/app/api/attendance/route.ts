import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Attendance from '@/models/Attendance';
import User from '@/models/User';
import SystemSettings from '@/models/SystemSettings';
import { calculateDistance } from '@/lib/geolocation';
import { verifyToken } from '@/lib/auth';
import { compareDeviceIds } from '@/lib/deviceId';
import { isValidCoordinate, ACCURACY_THRESHOLDS } from '@/lib/geolocation';

function extractToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.slice(7);
}

// Parse time strings like "9", "09", "9:00", "09:00", "9 AM", "9:00 PM"
function parseTimeString(timeStr: any, defaultHours = 18, defaultMinutes = 0) {
  if (!timeStr || typeof timeStr !== 'string') return { hours: defaultHours, minutes: defaultMinutes };
  const s = timeStr.trim().toUpperCase();
  const m = s.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)?$/);
  if (!m) return { hours: defaultHours, minutes: defaultMinutes };
  let hours = parseInt(m[1], 10);
  let minutes = m[2] ? parseInt(m[2], 10) : 0;
  const meridiem = m[3];
  if (meridiem) {
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
  }
  if (isNaN(hours) || isNaN(minutes)) return { hours: defaultHours, minutes: defaultMinutes };
  hours = Math.max(0, Math.min(23, hours));
  minutes = Math.max(0, Math.min(59, minutes));
  return { hours, minutes };
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

    const body = await req.json();
    let { latitude, longitude, deviceId, accuracy } = body;

    // Normalize incoming coordinates to numbers and fixed precision
    const parsedLat = Number.parseFloat(String(latitude));
    const parsedLon = Number.parseFloat(String(longitude));

    if (Number.isNaN(parsedLat) || Number.isNaN(parsedLon)) {
      return NextResponse.json(
        { error: 'Invalid location coordinates. Please ensure you have GPS enabled and try again.' },
        { status: 400 }
      );
    }

    // Round to consistent precision (7 decimal places)
    const normalizedLat = Number(parsedLat.toFixed(7));
    const normalizedLon = Number(parsedLon.toFixed(7));

    latitude = normalizedLat;
    longitude = normalizedLon;

    // Validate coordinate format and values
    if (!isValidCoordinate(latitude, longitude)) {
      return NextResponse.json(
        { error: 'Invalid location coordinates. Please ensure you have GPS enabled and try again.' },
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

    // Check device ID - support multiple allowed device IDs (deviceIds array) or legacy deviceId
    const registeredIds: string[] = Array.isArray((user as any).deviceIds) && (user as any).deviceIds.length > 0
      ? (user as any).deviceIds
      : user.deviceId ? [user.deviceId] : [];

    if (registeredIds.length > 0) {
      const matchFound = registeredIds.some((rid) => compareDeviceIds(rid, deviceId));
      if (!matchFound) {
        return NextResponse.json(
          {
            error: 'Device mismatch detected. You are using an unregistered device. Please contact your admin to update your device IDs.',
            reason: 'DEVICE_MISMATCH',
            registeredDeviceSample: registeredIds[0] ? String(registeredIds[0]).substring(0, 10) + '...' : null,
            currentDevice: deviceId.substring(0, 10) + '...',
          },
          { status: 403 }
        );
      }
      // matched - allow
    } else {
      // First time: register this device into user's deviceIds array
      if (!Array.isArray((user as any).deviceIds)) (user as any).deviceIds = [];
      (user as any).deviceIds.push(deviceId);
      await user.save();
      console.log(`Device registered for user ${user.name}: ${deviceId.substring(0, 15)}... (auto)`);
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
    
    // Get min GPS accuracy threshold (default 100 meters for real-world conditions)
    const minGpsAccuracy = (settings as any).minGpsAccuracy || 100;

    console.log('Settings loaded:', {
      shiftStartTime: settings.attendanceTime,
      shiftDuration: shiftDuration,
      attendanceRadius: settings.attendanceRadius,
      minGpsAccuracy: minGpsAccuracy,
      officeLocation: {
        lat: settings.officeLatitude,
        lon: settings.officeLongitude,
      },
    });

    // Validate office location is configured with valid coordinates
    if (!isValidCoordinate(settings.officeLatitude, settings.officeLongitude)) {
      return NextResponse.json(
        { error: 'Office location not properly configured. Admin must set valid coordinates in settings.' },
        { status: 400 }
      );
    }

    // Validate GPS accuracy if provided
    console.log('GPS Accuracy Check:', {
      userAccuracy: accuracy,
      minThreshold: minGpsAccuracy,
      passed: !accuracy || accuracy <= minGpsAccuracy,
    });

    if (accuracy !== undefined && accuracy !== null && accuracy > minGpsAccuracy) {
      console.error('GPS accuracy check failed:', {
        accuracy: accuracy,
        minGpsAccuracy: minGpsAccuracy,
        difference: accuracy - minGpsAccuracy,
      });

      // Provide more helpful error message based on how poor the accuracy is
      let errorMessage = `GPS accuracy (${Math.round(accuracy)}m) exceeds acceptable threshold (${minGpsAccuracy}m). `;
      let suggestion = 'Try moving to an open area or wait for better GPS signal. Admin can adjust threshold in Settings.';
      
      // If accuracy is extremely poor (> 1000m), give more specific guidance
      if (accuracy > 1000) {
        errorMessage = `Your GPS signal is extremely weak (${Math.round(accuracy)}m accuracy). `;
        suggestion = 'This usually means you\'re indoors or in a location with poor GPS coverage. Please move to an open area with a clear view of the sky (away from buildings and trees) and try again.';
      } else if (accuracy > 500) {
        errorMessage = `Your GPS signal is very weak (${Math.round(accuracy)}m accuracy). `;
        suggestion = 'Try moving to a more open area or wait a few moments for the GPS to lock onto more satellites.';
      }

      return NextResponse.json(
        {
          error: errorMessage + suggestion,
          currentAccuracy: Math.round(accuracy),
          requiredAccuracy: minGpsAccuracy,
          reason: 'LOW_GPS_ACCURACY',
          suggestion: suggestion,
          diagnostic: {
            accuracy: Math.round(accuracy),
            threshold: minGpsAccuracy,
            condition: accuracy > 1000 ? 'SEVERE' : accuracy > 500 ? 'POOR' : 'MARGINAL',
          }
        },
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

    // استخدم tolerance margin بسيط (10 متر إضافي) لتعويض عدم دقة GPS
    // GPS accuracy can vary by ±10-20 meters depending on device and conditions
    const GPS_TOLERANCE_METERS = 10;
    const effectiveRadius = settings.attendanceRadius + GPS_TOLERANCE_METERS;
    const withinRadius = distance <= effectiveRadius;

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

    // Robustly parse the shift start time (supports "9", "9:00", "9 AM", "21:00", etc.)
    const parsedShift = parseTimeString((settings as any).attendanceTime, 18, 0);
    let shiftStartHours = parsedShift.hours;
    let shiftStartMinutes = parsedShift.minutes;

    // Determine if check-in is within valid shift time or after shift ends
    let isLate = false;
    let lateMinutes = 0;
    let lateHours = 0;

    // Calculate shift boundaries in minutes
    const shiftStartTimeInMinutes = shiftStartHours * 60 + shiftStartMinutes;
    const shiftDurationInMinutes = shiftDuration * 60;
    // Allow employees to check in up to this many minutes early (default 60)
    const allowedEarlyMinutes = (settings as any).allowedEarlyMinutes ?? 60;
    
    // Get current time in minutes from start of day
    const currentTimeInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
    
    // Case 1: Shift does NOT wrap around midnight (e.g., 9 AM - 5 PM)
    if (shiftStartTimeInMinutes + shiftDurationInMinutes <= 24 * 60) {
      const shiftEndTimeInMinutes = shiftStartTimeInMinutes + shiftDurationInMinutes;
      
      if (currentTimeInMinutes < shiftStartTimeInMinutes) {
        // Before shift starts - allow if within early window, otherwise treat as previous day's shift ended
        const earlyBy = shiftStartTimeInMinutes - currentTimeInMinutes;
        if (earlyBy <= allowedEarlyMinutes) {
          // Early arrival within allowed window — treat as on-time (not late)
          isLate = false;
          lateMinutes = 0;
        } else {
          return NextResponse.json(
            {
              error: 'الشفت خلص - لا يمكن تسجيل الحضور بعد انتهاء الشفت',
              reason: 'SHIFT_ENDED',
              shiftStartTime: `${String(shiftStartHours).padStart(2, '0')}:${String(shiftStartMinutes).padStart(2, '0')}`,
              shiftEndTime: `${String(Math.floor(shiftEndTimeInMinutes / 60)).padStart(2, '0')}:${String(shiftEndTimeInMinutes % 60).padStart(2, '0')}`,
            },
            { status: 400 }
          );
        }
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
    let message = 'Attendance was recorded on time';
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

    // Also compute whether the user has already marked attendance for the current shift
    // Fetch settings to determine shift boundaries
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create({ attendanceTime: '09:00', officeLatitude: 0, officeLongitude: 0, officeName: 'Main Office', attendanceRadius: 500 });
    }

    // Determine today's shift date as in POST
    const today = new Date();
    const parsedShift = parseTimeString((settings as any).attendanceTime, 18, 0);
    let shiftStartHours = parsedShift.hours;
    let shiftStartMinutes = parsedShift.minutes;
    const shiftDuration = settings.shiftDuration || 9;

    const shiftStartTimeInMinutes = shiftStartHours * 60 + shiftStartMinutes;
    const shiftDurationInMinutes = shiftDuration * 60;
    const currentTimeInMinutes = today.getHours() * 60 + today.getMinutes();

    let shiftDate = new Date(today);
    if (currentTimeInMinutes < shiftStartTimeInMinutes && shiftStartTimeInMinutes + shiftDurationInMinutes > 24 * 60) {
      shiftDate.setDate(shiftDate.getDate() - 1);
    }

    const shiftDateStart = new Date(shiftDate);
    shiftDateStart.setHours(0, 0, 0, 0);
    const shiftDateEnd = new Date(shiftDateStart);
    shiftDateEnd.setDate(shiftDateEnd.getDate() + 1);

    const currentShiftAttendance = await Attendance.findOne({
      userId,
      date: { $gte: shiftDateStart, $lt: shiftDateEnd },
    });

    return NextResponse.json({ attendances, currentShiftAttendance, hasMarkedToday: !!currentShiftAttendance });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
  }
}