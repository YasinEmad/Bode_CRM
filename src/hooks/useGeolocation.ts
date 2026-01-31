import { useCallback, useRef } from 'react';
import { getCurrentPosition, GeolocationResult, GeolocationError, formatAccuracy } from '@/lib/geolocation';

export interface UseGeolocationOptions {
  minAccuracyThreshold?: number;
  requireHighAccuracy?: boolean;
  timeout?: number;
  allowInvalidCoordinates?: boolean;
}

export interface UseGeolocationReturn {
  getLocation: () => Promise<GeolocationResult>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook for unified geolocation acquisition
 * Uses GPS with WiFi/Cellular fallback for accurate positioning
 * Ensures consistent location settings across all pages (Admin Settings & Employee Attendance)
 * 
 * UNIFIED APPROACH:
 * - All pages (admin, sales) use identical geolocation method
 * - GPS with WiFi/Cellular fallback (requireHighAccuracy: false) for better accuracy in weak signal areas
 * - Default 60-second timeout for location lock
 * - Uses admin-configured minGpsAccuracy threshold (default 100m)
 * 
 * This ensures admin and employee capture coordinates using the same method,
 * making comparisons and distance calculations reliable. WiFi fallback helps in areas
 * with poor GPS coverage (indoors, dense urban areas, etc).
 */
export function useGeolocation() {
  const isLoadingRef = useRef(false);

  const getLocation = useCallback(
    (options?: UseGeolocationOptions): Promise<GeolocationResult> => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject({
            code: -1,
            message: 'Geolocation is not supported by your browser.',
          } as GeolocationError);
          return;
        }

        isLoadingRef.current = true;

        getCurrentPosition(
          (result: GeolocationResult) => {
            isLoadingRef.current = false;
            resolve(result);
          },
          (error: GeolocationError) => {
            isLoadingRef.current = false;
            reject(error);
          },
          {
            // Default consistent settings for all pages
            // GPS only mode (no WiFi/Cellular fallback)
            minAccuracyThreshold: options?.minAccuracyThreshold ?? 100,
            requireHighAccuracy: options?.requireHighAccuracy ?? true,
            timeout: options?.timeout ?? 60000, // 60 seconds default
            allowInvalidCoordinates: options?.allowInvalidCoordinates ?? false,
          }
        );
      });
    },
    []
  );

  return {
    getLocation,
    isLoading: isLoadingRef.current,
  };
}
