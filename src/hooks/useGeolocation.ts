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
 * Uses GPS-only mode for accurate outdoor positioning
 * Ensures consistent location settings across all pages
 * Provides consistent timeout, accuracy thresholds, and error handling
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
