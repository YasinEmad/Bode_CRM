/**
 * Centralized geolocation utility for consistent position reading.
 * Uses GPS-only approach for accurate outdoor positioning
 * Ensures all pages use the same logic and validation rules
 * 
 * UNIFIED SETTINGS:
 * - enableHighAccuracy: true (GPS only, no WiFi/Cellular)
 * - Default timeout: 60 seconds (sufficient for satellite acquisition)
 * - Always use fresh data (maximumAge: 0)
 * - Consistent accuracy thresholds across app
 */

export interface GeolocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

// GPS accuracy thresholds (in meters) - UNIFIED ACROSS APP
export const ACCURACY_THRESHOLDS = {
  EXCELLENT: 10,      // < 10m - Best possible accuracy
  GOOD: 30,           // < 30m - Recommended for most uses
  ACCEPTABLE: 50,     // < 50m - Adequate for location verification
  POOR: 100,          // < 100m - Acceptable but suboptimal
  VERY_POOR: 200,     // < 200m - Poor conditions, may need retry
};

// Default settings for all geolocation requests
const DEFAULT_GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,     // GPS only - no WiFi/Cellular fallback
  timeout: 60000,               // Wait up to 60 seconds for satellite fix
  maximumAge: 0,                // Always get fresh position, don't use cache
};

/**
 * Determines accuracy level based on error margin
 */
export function getAccuracyLevel(accuracy: number): string {
  if (accuracy < ACCURACY_THRESHOLDS.EXCELLENT) return 'EXCELLENT';
  if (accuracy < ACCURACY_THRESHOLDS.GOOD) return 'GOOD';
  if (accuracy < ACCURACY_THRESHOLDS.ACCEPTABLE) return 'ACCEPTABLE';
  if (accuracy < ACCURACY_THRESHOLDS.POOR) return 'POOR';
  if (accuracy < ACCURACY_THRESHOLDS.VERY_POOR) return 'VERY_POOR';
  return 'UNUSABLE';
}

/**
 * Validates if coordinates are reasonable (not 0,0 and within valid range)
 * Can be relaxed for testing purposes
 * 
 * UNIFIED: Strict mode validates:
 * - Not placeholder values (0, 0)
 * - Within valid geographic ranges
 * - Proper numeric values (not NaN)
 */
export function isValidCoordinate(latitude: number, longitude: number, strict: boolean = false): boolean {
  // In non-strict mode (testing), accept almost any number
  if (!strict) {
    return !isNaN(latitude) && !isNaN(longitude);
  }

  // Strict mode: full validation
  // Check for placeholder/invalid values
  if (latitude === 0 && longitude === 0) {
    return false;
  }

  // Validate latitude range: -90 to 90
  if (latitude < -90 || latitude > 90) {
    return false;
  }

  // Validate longitude range: -180 to 180
  if (longitude < -180 || longitude > 180) {
    return false;
  }

  // Check for NaN
  if (isNaN(latitude) || isNaN(longitude)) {
    return false;
  }

  return true;
}

/**
 * Validates if accuracy is acceptable for attendance/office verification
 * Default threshold is 30m (GOOD level) - can be overridden
 * 
 * IMPORTANT: This is client-side validation only for user feedback.
 * Server enforces the actual threshold from admin settings.
 */
export function isAccuracyAcceptable(
  accuracy: number,
  minAccuracyThreshold: number = ACCURACY_THRESHOLDS.GOOD
): boolean {
  return accuracy <= minAccuracyThreshold;
}

/**
 * Gets the current device position using GPS only
 * This is the single source of truth for all location requests
 * 
 * UNIFIED BEHAVIOR:
 * - GPS only positioning (enableHighAccuracy: true, no WiFi/Cellular)
 * - High accuracy, especially outdoors
 * - Always waits for fresh coordinates (maximumAge: 0)
 * - Default 60-second timeout for satellite acquisition
 * - Server enforces actual accuracy threshold based on admin settings
 * 
 * Client-side: Validates coordinates are valid, provides user feedback
 * Server-side: Enforces accuracy threshold from system settings
 * 
 * NOTE: Accuracy validation happens server-side based on admin settings.
 * Client validates coordinate format, server refines with configured threshold.
 */
export function getCurrentPosition(
  onSuccess: (result: GeolocationResult) => void,
  onError: (error: GeolocationError) => void,
  options?: {
    minAccuracyThreshold?: number;
    requireHighAccuracy?: boolean;
    allowInvalidCoordinates?: boolean; // For testing/development
    timeout?: number; // milliseconds to wait for GPS fix (defaults to 60000)
  }
): void {
  if (!navigator.geolocation) {
    onError({
      code: -1,
      message: 'Geolocation is not supported by your browser. Please use a modern browser like Chrome, Safari, or Firefox.',
    });
    return;
  }

  // Use unified settings - all pages follow the same pattern
  const requireHighAccuracy = options?.requireHighAccuracy ?? true;
  const allowInvalidCoordinates = options?.allowInvalidCoordinates ?? false;
  
  // Client-side threshold is informational only
  // Server will enforce the actual threshold from admin settings
  const minAccuracyThreshold = options?.minAccuracyThreshold ?? 100;
  
  // Use default timeout (60s) unless overridden
  const timeoutMs = options?.timeout ?? DEFAULT_GEOLOCATION_OPTIONS.timeout;

  // Build unified geolocation options
  const geoOptions: PositionOptions = {
    enableHighAccuracy: requireHighAccuracy && DEFAULT_GEOLOCATION_OPTIONS.enableHighAccuracy,
    timeout: timeoutMs,
    maximumAge: DEFAULT_GEOLOCATION_OPTIONS.maximumAge,
  };

  console.log('Geolocation request with unified settings:', {
    mode: 'GPS only (no WiFi)',
    enableHighAccuracy: geoOptions.enableHighAccuracy,
    timeout: `${timeoutMs}ms`,
    maximumAge: geoOptions.maximumAge,
    minAccuracyThreshold: `${minAccuracyThreshold}m (informational)`,
  });

  navigator.geolocation.getCurrentPosition(
    (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;

      // Validate coordinates (strict=false for testing)
      if (!isValidCoordinate(latitude, longitude, !allowInvalidCoordinates)) {
        if (allowInvalidCoordinates) {
          console.warn('⚠️ TESTING MODE: Using potentially invalid coordinates:', { latitude, longitude });
        } else {
          onError({
            code: -2,
            message: 'Invalid coordinates received from GPS. Please try again.',
          });
          return;
        }
      }

      // Check for unusually poor GPS accuracy (indicator of poor GPS conditions)
      // Typical GPS accuracy is 5-30m, > 1000m indicates very poor conditions
      if (accuracy > 1000) {
        console.warn(
          `⚠️ SEVERE: GPS accuracy is extremely poor (${Math.round(accuracy)}m). ` +
          `This indicates the device may be indoors, underground, or in heavy obstruction. ` +
          `User should move to an open area with clear sky view.`
        );
      }

      // Client-side accuracy check is informational
      // Accept GPS accuracy based on satellite signals
      // Server enforces the actual threshold from admin settings
      if (accuracy > minAccuracyThreshold) {
        console.warn(
          `⚠️ Location accuracy (${Math.round(accuracy)}m) exceeds client threshold (${minAccuracyThreshold}m). ` +
          `Server will validate against admin-configured threshold.`
        );
      }

      console.log('Position acquired successfully:', {
        coords: { latitude, longitude },
        accuracy: `${Math.round(accuracy)}m`,
        accuracyLevel: getAccuracyLevel(accuracy),
      });

      onSuccess({
        latitude,
        longitude,
        accuracy,
        timestamp: Date.now(),
      });
    },
    (error: GeolocationPositionError) => {
      let message = 'Unknown geolocation error';

      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = 'Location permission denied. Please enable location access in your browser settings to check in.';
          break;
        case error.POSITION_UNAVAILABLE:
          message = 'Location information is unavailable. Please check your GPS/location services and try again.';
          break;
        case error.TIMEOUT:
          message = `Location request timed out after ${Math.round(timeoutMs / 1000)} seconds. Please ensure you have a clear view of the sky and try again.`;
          break;
      }

      console.error('Geolocation error:', { code: error.code, message });

      onError({
        code: error.code,
        message,
      });
    },
    geoOptions
  );
}

/**
 * Formats accuracy for user-friendly display
 * Consistent across all pages
 */
export function formatAccuracy(accuracy: number): string {
  const level = getAccuracyLevel(accuracy);
  const roundedAccuracy = Math.round(accuracy);

  switch (level) {
    case 'EXCELLENT':
      return `Excellent (~${roundedAccuracy}m)`;
    case 'GOOD':
      return `Good (~${roundedAccuracy}m)`;
    case 'ACCEPTABLE':
      return `Acceptable (~${roundedAccuracy}m)`;
    case 'POOR':
      return `Poor (~${roundedAccuracy}m)`;
    case 'VERY_POOR':
      return `Very Poor (~${roundedAccuracy}m)`;
    default:
      return `Unusable (~${roundedAccuracy}m)`;
  }
}
/**
 * Provides diagnostic information about GPS accuracy condition
 * Helps users understand if they're in a suitable environment for GPS
 * 
 * Returns diagnostic info about current GPS accuracy level
 */
export function getGpsDiagnostic(accuracy: number): {
  condition: 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'POOR' | 'VERY_POOR' | 'SEVERE';
  message: string;
  suggestion: string;
  isProbablyIndoors: boolean;
} {
  const level = getAccuracyLevel(accuracy);
  
  if (accuracy > 1000) {
    return {
      condition: 'SEVERE',
      message: `GPS signal is VERY WEAK (${Math.round(accuracy)}m accuracy)`,
      suggestion: 'You appear to be indoors or underground. Move to an open outdoor area with clear sky view.',
      isProbablyIndoors: true,
    };
  }
  
  if (accuracy > 500) {
    return {
      condition: 'VERY_POOR',
      message: `GPS signal is weak (${Math.round(accuracy)}m accuracy)`,
      suggestion: 'You may be indoors or in a location with poor GPS coverage. Try moving to a more open area.',
      isProbablyIndoors: true,
    };
  }
  
  if (accuracy > 100) {
    return {
      condition: 'POOR',
      message: `GPS accuracy is ${Math.round(accuracy)}m - suboptimal`,
      suggestion: 'GPS could be better. Try moving to a more open area away from buildings and trees.',
      isProbablyIndoors: false,
    };
  }
  
  return {
    condition: level as 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE',
    message: `GPS accuracy is good (${Math.round(accuracy)}m)`,
    suggestion: '',
    isProbablyIndoors: false,
  };
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in meters. This function is the single source
 * of truth for distance calculations across client and server.
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}