'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, MapPin, Check, Crosshair, AlertCircle, Copy, X } from 'lucide-react';
import { getDeviceId, generateDeviceId } from '@/lib/deviceId';
import { formatAccuracy, ACCURACY_THRESHOLDS, calculateDistance } from '@/lib/geolocation';
import { useGeolocation } from '@/hooks/useGeolocation';

interface AttendanceRecord {
  _id: string;
  date: string;
  checkInTime: string;
  withinRadius: boolean;
  isLate: boolean;
  lateMinutes: number;
}

interface LocationDebug {
  userLat: number | null;
  userLon: number | null;
  userAccuracy: number | null;
  officeLat: number | null;
  officeLon: number | null;
  distance: number | null;
}

interface SystemSettings {
  officeLatitude: number;
  officeLongitude: number;
  officeName: string;
  attendanceRadius: number;
  minGpsAccuracy?: number;
}

export default function SalesAttendance() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast, removeToast, updateToast } = useToast();
  const { getLocation } = useGeolocation();
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isMarking, setIsMarking] = useState(false);
  const [isTestingLocation, setIsTestingLocation] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [locationDebug, setLocationDebug] = useState<LocationDebug | null>(null);
  const [officeSettings, setOfficeSettings] = useState<SystemSettings | null>(null);
  const [testedLocation, setTestedLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [deviceIdMismatch, setDeviceIdMismatch] = useState<{ lastDeviceId: string; newDeviceId: string } | null>(null);
  const [checkingDeviceAgain, setCheckingDeviceAgain] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'sales')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (token && user) {
      fetchAttendance();
      fetchOfficeSettings();
    }
  }, [token, user]);

  // Check device ID and show dialog if mismatch (called during Mark Attendance)
  const checkAndValidateDeviceId = async (isRetry: boolean = false): Promise<boolean> => {
    try {
      const currentDeviceId = generateDeviceId();
      
      console.log('\n========== DEVICE VALIDATION ==========');
      console.log('📱 Current Device ID:', currentDeviceId.substring(0, 30) + '...');
      console.log('🔄 Retry:', isRetry);

      // If this is a retry, wait a moment for DB to propagate
      if (isRetry) {
        console.log('⏳ Waiting for database update...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Fetch user data from backend (with cache busting)
      const meResponse = await fetch(`/api/auth/me?bust=${Date.now()}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });

      if (!meResponse.ok) {
        console.error('❌ Failed to fetch user data, status:', meResponse.status);
        addToast('Failed to verify device. Please try again.', 'error');
        return false;
      }

      const userData = await meResponse.json();
      const allowedDeviceIds = (userData.user?.deviceIds as string[]) || [];
      
      console.log('📋 Allowed Device IDs from backend:', allowedDeviceIds.length, 'devices');
      console.log('   Full list:', allowedDeviceIds.map((id: string) => id.substring(0, 20) + '...'));

      // Check if current device is allowed
      const isAllowed = allowedDeviceIds.includes(currentDeviceId);
      
      console.log('✅ Device Check Result:', isAllowed ? 'ALLOWED ✓' : 'NOT ALLOWED ✗');
      if (isAllowed) {
        console.log('   Current Device ID matches one of the allowed IDs');
      } else {
        console.log('   Current Device ID:', currentDeviceId.substring(0, 30) + '...');
        console.log('   Does not match any allowed ID in:', allowedDeviceIds.map((id: string) => id.substring(0, 30) + '...'));
      }

      if (isAllowed) {
        // Update localStorage with current device ID for future reference
        getDeviceId(); // This will cache the current device ID
        console.log('✅ Device ID is registered - proceeding with attendance');
        return true;
      }

      // Device not allowed - show dialog with option to retry
      console.warn('⚠️ Device NOT in allowed list - showing user dialog');
      setDeviceIdMismatch({
        lastDeviceId: getDeviceId(),
        newDeviceId: currentDeviceId,
      });
      return false;
    } catch (error) {
      console.error('❌ Error validating device ID:', error);
      addToast('Error validating device. Please try again.', 'error');
      return false;
    }
  };

  const handleDeviceMismatchConfirm = async () => {
    setCheckingDeviceAgain(true);
    
    try {
      // Try to validate again in case admin just registered the device
      // Pass isRetry=true to add a small delay for DB propagation
      const isValid = await checkAndValidateDeviceId(true);
      
      if (isValid) {
        setDeviceIdMismatch(null);
        setCheckingDeviceAgain(false);
        addToast('✅ Device has been registered! You can now mark attendance.', 'success');
        return;
      }

      // Still not registered - keep dialog open
      setCheckingDeviceAgain(false);
      addToast('Device ID not yet registered by admin. Please try again after admin registers it.', 'warning');
    } catch (error) {
      setCheckingDeviceAgain(false);
      console.error('Error in device mismatch confirm:', error);
      addToast('Error checking device registration.', 'error');
    }
  };

  const handleCopyNewDeviceId = async () => {
    if (deviceIdMismatch?.newDeviceId) {
      try {
        await navigator.clipboard.writeText(deviceIdMismatch.newDeviceId);
        addToast('✅ New Device ID copied to clipboard!', 'success');
      } catch (error) {
        addToast('Failed to copy Device ID', 'error');
      }
    }
  };

  const fetchOfficeSettings = async () => {
    try {
      // Use public office-location endpoint that sales staff can access
      const res = await fetch('/api/office-location');
      const data = await res.json();
      console.log('Office location API response:', { status: res.status, data });
      
      if (data.officeLocation) {
        // Map the response to our SystemSettings interface
        const officeData: SystemSettings = {
          officeLatitude: data.officeLocation.latitude,
          officeLongitude: data.officeLocation.longitude,
          officeName: data.officeLocation.name,
          attendanceRadius: data.officeLocation.radius,
          minGpsAccuracy: data.officeLocation.minGpsAccuracy,
        };
        setOfficeSettings(officeData);
        return officeData;
        console.log('Office settings loaded:', officeData);
      } else {
        console.warn('No office location found in response:', data);
        return null;
      }
    } catch (error) {
      console.error('Error fetching office location:', error);
      // Don't show error toast on load - settings might not be critical for initial display
      return null;
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await fetch(`/api/attendance?userId=${user?.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const records = Array.isArray(data.attendances) ? data.attendances : [];

      console.log('🔍 FETCHED ATTENDANCE RECORDS:', {
        count: records.length,
        firstRecord: records.length > 0 ? {
          _id: records[0]._id,
          date: records[0].date,
          checkInTime: records[0].checkInTime,
          isLate: records[0].isLate,
          lateMinutes: records[0].lateMinutes,
        } : null,
      });

      setAttendances(records);

      // Prefer server-provided flag indicating whether the user already marked for the current shift.
      // The API returns `hasMarkedToday` and optionally `currentShiftAttendance`.
      if (data && data.hasMarkedToday) {
        setTodayAttendance(data.currentShiftAttendance || null);
      } else {
        setTodayAttendance(null);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Test location without marking attendance
  const handleTestLocation = async () => {
    if (!navigator.geolocation) {
      addToast('Geolocation not supported on this device', 'error');
      return;
    }

    // Check if office settings are loaded
    if (!officeSettings) {
      const toastId = addToast('Loading office location...', 'loading');
      try {
        await fetchOfficeSettings();
        removeToast(toastId);
      } catch (error) {
        removeToast(toastId);
        addToast('Could not load office location. Please contact admin to configure office settings.', 'error');
        return;
      }
    }

    if (!officeSettings) {
      addToast('Office location not configured. Please contact admin.', 'error');
      return;
    }

    setIsTestingLocation(true);
    const toastId = addToast('Testing your GPS location...', 'loading');

    try {
      const threshold = officeSettings?.minGpsAccuracy ?? 100;
      const result = await getLocation({
        minAccuracyThreshold: threshold,
        requireHighAccuracy: false,
        timeout: 60000,
        allowInvalidCoordinates: false,
      });

      console.log('Test location result:', {
        latitude: result.latitude,
        longitude: result.longitude,
        accuracy: result.accuracy,
      });

      const distance = calculateDistance(
        result.latitude,
        result.longitude,
        officeSettings.officeLatitude,
        officeSettings.officeLongitude
      );

      const debugInfo: LocationDebug = {
        userLat: result.latitude,
        userLon: result.longitude,
        userAccuracy: result.accuracy,
        officeLat: officeSettings.officeLatitude,
        officeLon: officeSettings.officeLongitude,
        distance: distance,
      };

      // Save the tested location so it can be reused for marking attendance
      setTestedLocation({
        latitude: Number(result.latitude.toFixed(7)),
        longitude: Number(result.longitude.toFixed(7)),
        accuracy: result.accuracy,
      });

      setLocationDebug(debugInfo);

      console.log('Location Debug Info:', debugInfo);

      removeToast(toastId);

      const distanceKm = (distance / 1000).toFixed(2);
      const msg = `📍 You: ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}\n🏢 Office: ${officeSettings.officeLatitude.toFixed(4)}, ${officeSettings.officeLongitude.toFixed(4)}\n📏 Distance: ${Math.round(distance)}m (${distanceKm}km)\n📡 Accuracy: ${formatAccuracy(result.accuracy)}\n\n✅ You can now mark attendance with this location!`;
      addToast(msg, 'success');

      // If accuracy is extremely poor, show an explicit diagnostic toast with office info
      if (result.accuracy > 1000) {
        const diag = `⚠️ GPS accuracy is very poor (${Math.round(result.accuracy)}m). Office: ${officeSettings.officeLatitude.toFixed(4)}, ${officeSettings.officeLongitude.toFixed(4)}. Distance: ${Math.round(distance)}m.`;
        console.warn('TEST LOCATION DIAGNOSTIC:', { diag, result, office: officeSettings });
        addToast(diag, 'error');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to test location';
      console.error('Test location error:', errorMsg);
      removeToast(toastId);
      addToast(errorMsg, 'error');
    } finally {
      setIsTestingLocation(false);
    }
  };

  const handleMarkAttendance = async () => {
    if (!navigator.geolocation) {
      addToast('Geolocation not supported on this device', 'error');
      return;
    }

    // First, check and validate device ID
    const deviceIdValid = await checkAndValidateDeviceId();
    if (!deviceIdValid) {
      // Dialog will be shown automatically via setDeviceIdMismatch
      return;
    }

    setIsMarking(true);
    const toastId = addToast('Preparing to mark attendance...', 'loading');
    let sendToastId: string | null = null;

    // Ensure we have the latest office coordinates from server before proceeding
    const latestOffice = await fetchOfficeSettings();
    if (!latestOffice) {
      removeToast(toastId);
      addToast('Failed to load office location. Please contact admin.', 'error');
      setIsMarking(false);
      return;
    }

    try {
      let result;

      // إذا كان عندك موقع مختبر وDقيق، استخدمه بدلاً من الحصول على موقع جديد
      const latestThreshold = officeSettings?.minGpsAccuracy ?? 100;
      if (testedLocation && testedLocation.accuracy <= latestThreshold) {
        console.log('Using tested location with good accuracy:', testedLocation);
        removeToast(toastId);
        const confirmToastId = addToast(
          `Using your tested location (Accuracy: ${formatAccuracy(testedLocation.accuracy)})...`,
          'loading'
        );
        result = testedLocation;
        removeToast(confirmToastId);
      } else {
        // Get fresh location using unified method
        removeToast(toastId);
        const newToastId = addToast('Getting fresh location (GPS + WiFi)...', 'loading');
        
        // UNIFIED ACQUISITION: Same settings as test location and admin settings
        // Allow WiFi/Cellular fallback for better accuracy
        const reqThreshold = officeSettings?.minGpsAccuracy ?? 100;
        result = await getLocation({
          minAccuracyThreshold: reqThreshold,
          requireHighAccuracy: false,
          timeout: 60000,
          allowInvalidCoordinates: false,
        });

        removeToast(newToastId);

        console.log('Mark Attendance - User position:', {
          latitude: result.latitude,
          longitude: result.longitude,
          accuracy: result.accuracy,
          accuracyLevel: formatAccuracy(result.accuracy),
        });

        // احفظ الموقع الجديد
        setTestedLocation({
          latitude: Number(result.latitude.toFixed(7)),
          longitude: Number(result.longitude.toFixed(7)),
          accuracy: result.accuracy,
        });

        // تحذير إذا كانت الدقة سيئة جداً
        if (result.accuracy > 1000) {
          const distanceNow = officeSettings ? calculateDistance(result.latitude, result.longitude, officeSettings.officeLatitude, officeSettings.officeLongitude) : null;
          console.warn('⚠️ SEVERE GPS ACCURACY:', result.accuracy, { officeSettings, distanceNow });
          const diagMsg = `GPS accuracy is ${Math.round(result.accuracy)}m - very poor. ${distanceNow !== null ? `Distance to office: ${Math.round(distanceNow)}m.` : ''} You may be indoors. Please move to open area and try again.`;
          addToast(diagMsg, 'error');
          setIsMarking(false);
          return;
        }
      }

      // أرسل البيانات للخادم
      sendToastId = addToast('Sending to server...', 'loading');
      
      // Get client's local time and timezone offset
      const now = new Date();
      const clientLocalTimeISO = now.toISOString();
      const timezoneOffsetMinutes = now.getTimezoneOffset();
      
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude: Number((result.latitude as number).toFixed(7)),
          longitude: Number((result.longitude as number).toFixed(7)),
          accuracy: result.accuracy,
          deviceId: getDeviceId(),
          clientLocalTimeISO: clientLocalTimeISO,
          timezoneOffsetMinutes: timezoneOffsetMinutes,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        const errorMsg = typeof errorData.error === 'string' 
          ? errorData.error 
          : 'Failed to mark attendance';
        throw new Error(errorMsg);
      }

      const data = await res.json();

      console.log('===== ATTENDANCE RESPONSE =====');
      console.log('Full Response:', JSON.stringify(data, null, 2));
      console.log('isLate:', data.isLate, 'type:', typeof data.isLate);
      console.log('lateMinutes:', data.lateMinutes, 'type:', typeof data.lateMinutes);
      console.log('Expected Shift Start Time:', data.shiftStartTime);
      console.log('Shift Duration:', data.shiftDuration);
      console.log('Location Accuracy:', formatAccuracy(result.accuracy));
      console.log('===============================');

      removeToast(sendToastId);

      // إذا كان التحقق متأخراً
      if (data.isLate === true) {
        console.log('CONDITION MET: User is late!');
        const hours = Math.floor(data.lateMinutes / 60);
        const minutes = data.lateMinutes % 60;
        let lateMessage = `⏰ You are ${minutes > 0 ? `${minutes} minute${minutes !== 1 ? 's' : ''}` : ''}${hours > 0 && minutes > 0 ? ' and ' : ''}${hours > 0 ? `${hours} hour${hours !== 1 ? 's' : ''}` : ''} late!`;
        lateMessage += ` (GPS: ${formatAccuracy(result.accuracy)})`;
        console.log('Late message:', lateMessage);
        addToast(lateMessage, 'warning');
      } else {
        console.log('CONDITION NOT MET: Showing success message');
        let successMessage = '✅ Check-in marked today';
        successMessage += ` (GPS: ${formatAccuracy(result.accuracy)})`;
        addToast(successMessage, 'success');
      }

      fetchAttendance();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to mark attendance';
      console.warn('Attendance error:', errorMsg);
      removeToast(toastId);
      if (sendToastId) removeToast(sendToastId);
      addToast(errorMsg, 'error');
    } finally {
      setIsMarking(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Mark Attendance</h1>
          <p className="text-slate-400">Check in using your GPS location with high precision</p>
        </div>

        {/* Attendance Button */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-2xl p-8 md:p-12 mb-12 text-center border border-slate-700 hover:border-blue-500 transition-all">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <MapPin size={40} className="text-white" />
          </div>

          <p className="text-slate-300 mb-8 text-lg">
            {todayAttendance
              ? '✅ Check-in marked today'
              : '📍 Click the button below to mark your attendance using your GPS location. For best accuracy, use a mobile device with GPS enabled and try to be in an open area.'}
          </p>

          <button
            onClick={handleMarkAttendance}
            disabled={isMarking || !!todayAttendance}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:bg-slate-600 text-white py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-3 mb-6 transition-all"
          >
            {isMarking ? (
              <>
                <Loader size={24} className="animate-spin" />
                Marking Attendance...
              </>
            ) : todayAttendance ? (
              <>
                <Check size={24} />
                Checked In
              </>
            ) : testedLocation && testedLocation.accuracy <= 100 ? (
              <>
                <MapPin size={24} />
                Mark Attendance (Good GPS Signal ✓)
              </>
            ) : (
              <>
                <MapPin size={24} />
                Mark Attendance Now
              </>
            )}
          </button>

          <button
            onClick={handleTestLocation}
            disabled={isTestingLocation || isMarking || !!todayAttendance}
            className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 disabled:bg-slate-600 text-white py-3 rounded-lg font-bold text-base flex items-center justify-center gap-3 transition-all"
          >
            {isTestingLocation ? (
              <>
                <Loader size={20} className="animate-spin" />
                Testing GPS...
              </>
            ) : (
              <>
                <Crosshair size={20} />
                Test My Location
              </>
            )}
          </button>
        </div>

        {/* Location Debug Info */}
        {locationDebug && (
          <div className="mb-12 bg-slate-700 rounded-2xl shadow-xl p-6 border border-slate-600">
            <h3 className="text-xl font-bold text-white mb-4">📍 Location Debug Info</h3>
            <div className="space-y-3 text-sm text-slate-300">
              <div className="flex justify-between">
                <span>Your Location:</span>
                <span className="font-mono text-blue-400">{locationDebug.userLat?.toFixed(6)}, {locationDebug.userLon?.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span>GPS Accuracy:</span>
                <span className="font-mono text-blue-400">{Math.round(locationDebug.userAccuracy || 0)}m</span>
              </div>
              <div className="h-px bg-slate-600 my-2"></div>
              <div className="flex justify-between">
                <span>Office Location:</span>
                <span className="font-mono text-amber-400">{locationDebug.officeLat?.toFixed(6)}, {locationDebug.officeLon?.toFixed(6)}</span>
              </div>
              <div className="h-px bg-slate-600 my-2"></div>
              <div className="flex justify-between">
                <span>Distance:</span>
                <span className="font-mono text-red-400">{Math.round(locationDebug.distance || 0)}m ({((locationDebug.distance || 0) / 1000).toFixed(2)}km)</span>
              </div>
            </div>
          </div>
        )}

        {/* Attendance History */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Recent Attendance</h2>
          <p className="text-slate-400">Your last 10 attendance records</p>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-20">
            <Loader size={40} className="animate-spin text-blue-400" />
          </div>
        ) : attendances.length === 0 ? (
          <div className="bg-slate-700 rounded-2xl shadow-xl p-16 text-center border border-slate-600">
            <p className="text-slate-300">🤷 No attendance records yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {attendances.slice(0, 10).map((record) => (
              <div
                key={record._id}
                className="bg-slate-800 rounded-2xl shadow-xl p-5 border-l-4 border-emerald-500 hover:border-emerald-400 transition-all hover:shadow-2xl border border-slate-700"
              >
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <p className="font-semibold text-white text-lg">
                      {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-sm text-slate-400 mt-2">
                      🕐 Check-in: {new Date(record.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {record.isLate && (
                      <span className="px-3 py-2 rounded-full text-sm font-medium bg-amber-600 text-white text-center">
                        ⏰ {record.lateMinutes}m late
                      </span>
                    )}
                    <span className={`px-4 py-2 rounded-full text-sm font-medium flex items-center justify-center gap-2 ${record.withinRadius ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                      {record.withinRadius ? '✓ Check-in' : '⚠️ Out of range'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Device ID Mismatch Dialog */}
      {deviceIdMismatch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-amber-600">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-white" size={28} />
                <h2 className="text-xl font-bold text-white">New Device Detected</h2>
              </div>
              <button
                onClick={() => setDeviceIdMismatch(null)}
                className="text-white hover:bg-amber-700 p-1 rounded transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              <p className="text-slate-300">
                We detected a different device than your last registration. Your administrator may have already registered this device ID. Click "Check Again" to verify, or send the Device ID below to your administrator if needed.
              </p>

              {/* New Device ID Card */}
              <div className="bg-slate-700/50 rounded-lg p-4 border border-cyan-600">
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">📱 Current Device ID</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs font-mono text-cyan-300 break-all bg-slate-800 p-3 rounded">
                    {deviceIdMismatch.newDeviceId}
                  </code>
                  <button
                    onClick={handleCopyNewDeviceId}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white p-2 rounded transition-all flex-shrink-0"
                    title="Copy to clipboard"
                  >
                    <Copy size={18} />
                  </button>
                </div>
              </div>

              <div className="bg-green-900/30 rounded-lg p-3 border border-green-700">
                <p className="text-green-300 text-sm">
                  ✓ <strong>Click "Check Again"</strong> - Your admin may have just registered this device!
                </p>
              </div>

              <div className="bg-blue-900/30 rounded-lg p-3 border border-blue-700">
                <p className="text-blue-300 text-sm">
                  ℹ️ If not registered yet, copy the Device ID and send it to your administrator.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-700 px-6 py-4 flex gap-3">
              <button
                onClick={() => setDeviceIdMismatch(null)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-semibold transition-all disabled:opacity-50"
                disabled={checkingDeviceAgain}
              >
                Close
              </button>
              <button
                onClick={handleDeviceMismatchConfirm}
                disabled={checkingDeviceAgain}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {checkingDeviceAgain ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Check Again'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
