'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, MapPin, Check, Crosshair, AlertCircle, Copy, X } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getDeviceId, generateDeviceId, setDeviceId } from '@/lib/deviceId';
import { formatAccuracy, calculateDistance } from '@/lib/geolocation';
import { formatMinutesToHours } from '@/lib/time';
import { useAuth } from '@/hooks/useAuth';

interface Props {
  initialTodayAttendance?: any | null;
  onMarked?: () => void;
}

export default function MarkAttendanceCard({ initialTodayAttendance = null, onMarked }: Props) {
  const { user, token } = useAuth();
  const { addToast, removeToast } = useToast();
  const { getLocation } = useGeolocation();

  const [isMarking, setIsMarking] = useState(false);
  const [isTestingLocation, setIsTestingLocation] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any | null>(initialTodayAttendance);
  const [locationDebug, setLocationDebug] = useState<any | null>(null);
  const [officeSettings, setOfficeSettings] = useState<any | null>(null);
  const [testedLocation, setTestedLocation] = useState<any | null>(null);
  const [deviceIdMismatch, setDeviceIdMismatch] = useState<any | null>(null);
  const [checkingDeviceAgain, setCheckingDeviceAgain] = useState(false);

  const fetchOfficeSettings = async () => {
    try {
      const res = await fetch('/api/office-location');
      const data = await res.json();
      if (data.officeLocation) {
        const officeData = {
          officeLatitude: data.officeLocation.latitude,
          officeLongitude: data.officeLocation.longitude,
          officeName: data.officeLocation.name,
          attendanceRadius: data.officeLocation.radius,
          minGpsAccuracy: data.officeLocation.minGpsAccuracy,
        };
        setOfficeSettings(officeData);
        return officeData;
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const checkAndValidateDeviceId = async (isRetry: boolean = false): Promise<boolean> => {
    try {
      const currentDeviceId = generateDeviceId();

      if (isRetry) await new Promise((r) => setTimeout(r, 1000));

      const meResponse = await fetch(`/api/auth/me?bust=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!meResponse.ok) {
        addToast('Failed to verify device. Please try again.', 'error');
        return false;
      }

      const userData = await meResponse.json();
      const allowedDeviceIds = (userData.user?.deviceIds as string[]) || [];
      const isAllowed = allowedDeviceIds.includes(currentDeviceId);

      if (isAllowed) {
        setDeviceId(currentDeviceId);
        return true;
      }

      const isFirstTime = allowedDeviceIds.length === 0;
      if (isFirstTime) {
        setDeviceId(currentDeviceId);
        return true;
      }

      setDeviceIdMismatch({ lastDeviceId: getDeviceId(), newDeviceId: currentDeviceId, isFirstTime: false });
      return false;
    } catch (error) {
      addToast('Error validating device. Please try again.', 'error');
      return false;
    }
  };

  const handleDeviceMismatchConfirm = async () => {
    setCheckingDeviceAgain(true);
    try {
      const isValid = await checkAndValidateDeviceId(true);
      if (isValid) {
        setDeviceIdMismatch(null);
        setCheckingDeviceAgain(false);
        addToast('✅ Device has been registered! You can now mark attendance.', 'success');
        return;
      }
      setCheckingDeviceAgain(false);
      addToast('Device ID not yet registered by admin. Please try again after admin registers it.', 'warning');
    } catch (error) {
      setCheckingDeviceAgain(false);
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

  const handleTestLocation = async () => {
    if (!navigator.geolocation) {
      addToast('Geolocation not supported on this device', 'error');
      return;
    }

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

      const distance = calculateDistance(result.latitude, result.longitude, officeSettings.officeLatitude, officeSettings.officeLongitude);

      const debugInfo = {
        userLat: result.latitude,
        userLon: result.longitude,
        userAccuracy: result.accuracy,
        officeLat: officeSettings.officeLatitude,
        officeLon: officeSettings.officeLongitude,
        distance,
      };

      setTestedLocation({ latitude: Number(result.latitude.toFixed(7)), longitude: Number(result.longitude.toFixed(7)), accuracy: result.accuracy });
      setLocationDebug(debugInfo);
      removeToast(toastId);

      const distanceKm = (distance / 1000).toFixed(2);
      const msg = `📍 You: ${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}\n🏢 Office: ${officeSettings.officeLatitude.toFixed(4)}, ${officeSettings.officeLongitude.toFixed(4)}\n📏 Distance: ${Math.round(distance)}m (${distanceKm}km)\n📡 Accuracy: ${formatAccuracy(result.accuracy)}\n\n✅ You can now mark attendance with this location!`;
      addToast(msg, 'success');

      if (result.accuracy > 1000) {
        const diag = `⚠️ GPS accuracy is very poor (${Math.round(result.accuracy)}m). Office: ${officeSettings.officeLatitude.toFixed(4)}, ${officeSettings.officeLongitude.toFixed(4)}. Distance: ${Math.round(distance)}m.`;
        addToast(diag, 'error');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to test location';
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

    const deviceIdValid = await checkAndValidateDeviceId(true);
    if (!deviceIdValid) return;

    setIsMarking(true);
    const toastId = addToast('Preparing to mark attendance...', 'loading');
    let sendToastId: string | null = null;

    const latestOffice = await fetchOfficeSettings();
    if (!latestOffice) {
      removeToast(toastId);
      addToast('Failed to load office location. Please contact admin.', 'error');
      setIsMarking(false);
      return;
    }

    try {
      let result: any;
      const latestThreshold = officeSettings?.minGpsAccuracy ?? 100;
      if (testedLocation && testedLocation.accuracy <= latestThreshold) {
        removeToast(toastId);
        const confirmToastId = addToast(`Using your tested location (Accuracy: ${formatAccuracy(testedLocation.accuracy)})...`, 'loading');
        result = testedLocation;
        removeToast(confirmToastId);
      } else {
        removeToast(toastId);
        const newToastId = addToast('Getting fresh location (GPS + WiFi)...', 'loading');
        const reqThreshold = officeSettings?.minGpsAccuracy ?? 100;
        result = await getLocation({ minAccuracyThreshold: reqThreshold, requireHighAccuracy: false, timeout: 60000, allowInvalidCoordinates: false });
        removeToast(newToastId);

        setTestedLocation({ latitude: Number(result.latitude.toFixed(7)), longitude: Number(result.longitude.toFixed(7)), accuracy: result.accuracy });

        if (result.accuracy > 1000) {
          const distanceNow = officeSettings ? calculateDistance(result.latitude, result.longitude, officeSettings.officeLatitude, officeSettings.officeLongitude) : null;
          const diagMsg = `GPS accuracy is ${Math.round(result.accuracy)}m - very poor. ${distanceNow !== null ? `Distance to office: ${Math.round(distanceNow)}m.` : ''} You may be indoors. Please move to open area and try again.`;
          addToast(diagMsg, 'error');
          setIsMarking(false);
          return;
        }
      }

      sendToastId = addToast('Sending to server...', 'loading');

      const now = new Date();
      const clientLocalTimeISO = now.toISOString();
      const timezoneOffsetMinutes = now.getTimezoneOffset();

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ latitude: Number((result.latitude as number).toFixed(7)), longitude: Number((result.longitude as number).toFixed(7)), accuracy: result.accuracy, deviceId: getDeviceId(), clientLocalTimeISO, timezoneOffsetMinutes }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMsg = typeof errorData.error === 'string' ? errorData.error : 'Failed to mark attendance';
        throw new Error(errorMsg);
      }

      const data = await res.json();
      removeToast(sendToastId);

      if (data.isLate === true) {
        const formatted = formatMinutesToHours(data.lateMinutes);
        let lateMessage = `⏰ You are ${formatted} late!`;
        lateMessage += ` (GPS: ${formatAccuracy(result.accuracy)})`;
        addToast(lateMessage, 'warning');
      } else {
        let successMessage = '✅ Check-in marked today';
        successMessage += ` (GPS: ${formatAccuracy(result.accuracy)})`;
        addToast(successMessage, 'success');
      }

      setTodayAttendance(data.currentShiftAttendance || null);
      if (onMarked) onMarked();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to mark attendance';
      if (sendToastId) removeToast(sendToastId);
      removeToast(toastId);
      addToast(errorMsg, 'error');
    } finally {
      setIsMarking(false);
    }
  };

  // Keep local state in sync when parent updates the prop
  useEffect(() => {
    setTodayAttendance(initialTodayAttendance);
  }, [initialTodayAttendance]);

  // If parent didn't provide attendance data, fetch it once (useful on dashboard)
  useEffect(() => {
    const fetchMyAttendance = async () => {
      try {
        if (!user || !token) return;
        const res = await fetch(`/api/attendance?userId=${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.hasMarkedToday) {
          setTodayAttendance(data.currentShiftAttendance || null);
        } else {
          setTodayAttendance(null);
        }
      } catch (err) {
        // ignore
      }
    };

    // Only fetch if initial prop is strictly undefined (caller didn't pass it)
    // but our default is null; detect absence by checking arguments length is 0 isn't possible here,
    // so fetch when todayAttendance is null to ensure dashboard shows current state.
    if (todayAttendance === null) {
      fetchMyAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-2xl p-8 md:p-12 mb-12 text-center border border-slate-700 hover:border-blue-500 transition-all">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
        <MapPin size={40} className="text-white" />
      </div>

      <p className="text-slate-300 mb-8 text-lg">
        {todayAttendance
          ? '✅ Check-in marked today'
          : '📍 Click the button below to mark your attendance using your GPS location. For best accuracy, use a mobile device with GPS enabled and try to be in an open area.'}
      </p>

      <button onClick={handleMarkAttendance} disabled={isMarking || !!todayAttendance} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:bg-slate-600 text-white py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-3 mb-6 transition-all">
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

      <button onClick={handleTestLocation} disabled={isTestingLocation || isMarking || !!todayAttendance} className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 disabled:bg-slate-600 text-white py-3 rounded-lg font-bold text-base flex items-center justify-center gap-3 transition-all">
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

      {locationDebug && (
        <div className="mt-6 bg-slate-700 rounded-2xl shadow-xl p-6 border border-slate-600 text-left">
          <h3 className="text-lg font-bold text-white mb-3">📍 Location Debug Info</h3>
          <div className="space-y-2 text-sm text-slate-300">
            <div className="flex justify-between"><span>Your Location:</span><span className="font-mono text-blue-400">{locationDebug.userLat?.toFixed(6)}, {locationDebug.userLon?.toFixed(6)}</span></div>
            <div className="flex justify-between"><span>GPS Accuracy:</span><span className="font-mono text-blue-400">{Math.round(locationDebug.userAccuracy || 0)}m</span></div>
            <div className="h-px bg-slate-600 my-2"></div>
            <div className="flex justify-between"><span>Office Location:</span><span className="font-mono text-amber-400">{locationDebug.officeLat?.toFixed(6)}, {locationDebug.officeLon?.toFixed(6)}</span></div>
            <div className="h-px bg-slate-600 my-2"></div>
            <div className="flex justify-between"><span>Distance:</span><span className="font-mono text-red-400">{Math.round(locationDebug.distance || 0)}m ({((locationDebug.distance || 0) / 1000).toFixed(2)}km)</span></div>
          </div>
        </div>
      )}

      {deviceIdMismatch && (
        <div className="fixed inset-0 bg-slate-800/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl md:max-w-lg sm:max-w-xl border border-amber-600 max-h-[calc(100vh-6rem)] overflow-auto ring-1 ring-slate-700">
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-white" size={28} />
                <h2 className="text-xl font-bold text-white">New Device Detected</h2>
              </div>
              <button onClick={() => setDeviceIdMismatch(null)} className="text-white hover:bg-amber-700 p-1 rounded transition-all"><X size={24} /></button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <p className="text-slate-300">We detected a different device than your last registration. Your administrator may have already registered this device ID. Click "Check Again" to verify, or send the Device ID below to your administrator if needed.</p>

              <div className="bg-slate-700/40 rounded-lg p-3 sm:p-4 border border-cyan-600">
                <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">📱 Current Device ID</p>
                <div className="relative">
                  <pre className="whitespace-pre-wrap break-words text-xs sm:text-sm font-mono text-cyan-300 bg-slate-800 p-3 rounded max-h-36 sm:max-h-44 overflow-auto pr-10">{deviceIdMismatch.newDeviceId}</pre>
                  <button onClick={handleCopyNewDeviceId} className="absolute top-2 right-2 bg-cyan-600 hover:bg-cyan-700 text-white p-2 rounded transition-all" title="Copy to clipboard"><Copy size={16} /></button>
                </div>
              </div>

              <div className="border-t border-slate-700 px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-3">
                <button onClick={() => setDeviceIdMismatch(null)} className="w-full sm:flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-semibold transition-all disabled:opacity-50" disabled={checkingDeviceAgain}>Close</button>
                <button onClick={handleDeviceMismatchConfirm} disabled={checkingDeviceAgain} className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">{checkingDeviceAgain ? (<><Loader size={18} className="animate-spin" /><span className="sr-only">Checking</span></>) : ('Check Again')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
