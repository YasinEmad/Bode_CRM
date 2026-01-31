import { NextRequest, NextResponse } from 'next/server';
import { isValidCoordinate, getAccuracyLevel, ACCURACY_THRESHOLDS } from '@/lib/geolocation';

/**
 * Debug endpoint to validate location coordinates
 * Useful for testing GPS accuracy and coordinate validity
 */
export async function POST(req: NextRequest) {
  try {
    const { latitude, longitude, accuracy } = await req.json();

    // Validate coordinates
    const isValid = isValidCoordinate(latitude, longitude);
    const accuracyLevel = accuracy ? getAccuracyLevel(accuracy) : null;
    const isAcceptable = accuracy ? accuracy <= ACCURACY_THRESHOLDS.GOOD : null;

    return NextResponse.json({
      coordinates: {
        latitude,
        longitude,
        isValid,
      },
      accuracy: {
        value: accuracy,
        level: accuracyLevel,
        isAcceptable,
        thresholds: {
          EXCELLENT: ACCURACY_THRESHOLDS.EXCELLENT,
          GOOD: ACCURACY_THRESHOLDS.GOOD,
          ACCEPTABLE: ACCURACY_THRESHOLDS.ACCEPTABLE,
          POOR: ACCURACY_THRESHOLDS.POOR,
          VERY_POOR: ACCURACY_THRESHOLDS.VERY_POOR,
        },
      },
      diagnostics: {
        latitudeValid: latitude >= -90 && latitude <= 90,
        longitudeValid: longitude >= -180 && longitude <= 180,
        notPlaceholder: !(latitude === 0 && longitude === 0),
        notNaN: !isNaN(latitude) && !isNaN(longitude),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request', details: error instanceof Error ? error.message : '' },
      { status: 400 }
    );
  }
}
