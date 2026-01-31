import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import SystemSettings from '@/models/SystemSettings';

/**
 * PUBLIC endpoint to get office location
 * Used by sales staff for attendance check-in location verification
 * Does not require authentication - office location is not sensitive data
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const settings = await SystemSettings.findOne();
    
    if (!settings) {
      return NextResponse.json(
        { 
          error: 'Office location not configured',
          officeLocation: null
        },
        { status: 404 }
      );
    }

    // Return only office location info needed for attendance
    return NextResponse.json({
      officeLocation: {
        latitude: settings.officeLatitude,
        longitude: settings.officeLongitude,
        name: settings.officeName,
        radius: settings.attendanceRadius,
        minGpsAccuracy: settings.minGpsAccuracy || 100,
      }
    });
  } catch (error) {
    console.error('Error fetching office location:', error);
    return NextResponse.json(
      { error: 'Failed to fetch office location' },
      { status: 500 }
    );
  }
}
