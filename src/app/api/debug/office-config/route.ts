import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import SystemSettings from '@/models/SystemSettings';

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

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const settings = await SystemSettings.findOne();
    
    if (!settings) {
      return NextResponse.json({ 
        error: 'No office settings configured',
        settings: null 
      }, { status: 404 });
    }

    // Get user location from query params for testing
    const userLat = req.nextUrl.searchParams.get('lat');
    const userLon = req.nextUrl.searchParams.get('lon');

    const config = {
      officeName: settings.officeName,
      officeLatitude: settings.officeLatitude,
      officeLongitude: settings.officeLongitude,
      attendanceRadius: settings.attendanceRadius,
      attendanceTime: settings.attendanceTime,
      isOfficeConfigured: !(settings.officeLatitude === 0 && settings.officeLongitude === 0),
    };

    if (userLat && userLon) {
      const userLat_num = parseFloat(userLat);
      const userLon_num = parseFloat(userLon);
      
      const distance = calculateDistance(
        userLat_num,
        userLon_num,
        settings.officeLatitude,
        settings.officeLongitude
      );

      return NextResponse.json({
        config,
        testLocation: {
          userLatitude: userLat_num,
          userLongitude: userLon_num,
          distanceFromOffice: Math.round(distance),
          withinRadius: distance <= settings.attendanceRadius,
          radiusAllowed: settings.attendanceRadius,
        }
      });
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error fetching office config:', error);
    return NextResponse.json({ error: 'Failed to fetch office configuration' }, { status: 500 });
  }
}
