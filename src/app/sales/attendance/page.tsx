'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, MapPin, Check, Crosshair } from 'lucide-react';
import { getDeviceId } from '@/lib/deviceId';
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
        console.log('Office settings loaded:', officeData);
      } else {
        console.warn('No office location found in response:', data);
      }
    } catch (error) {
      console.error('Error fetching office location:', error);
      // Don't show error toast on load - settings might not be critical for initial display
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
      const result = await getLocation({
        minAccuracyThreshold: 100,
        requireHighAccuracy: true,
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

    setIsMarking(true);
    const toastId = addToast('Preparing to mark attendance...', 'loading');

    try {
      let result;

      // إذا كان عندك موقع مختبر وDقيق، استخدمه بدلاً من الحصول على موقع جديد
      if (testedLocation && testedLocation.accuracy <= 100) {
        console.log('Using tested location with good accuracy:', testedLocation);
        removeToast(toastId);
        const confirmToastId = addToast(
          `Using your tested location (Accuracy: ${formatAccuracy(testedLocation.accuracy)})...`,
          'loading'
        );
        result = testedLocation;
        removeToast(confirmToastId);
      } else {
        // احصل على موقع جديد فقط إذا لم يكن عندك موقع مختبر
        removeToast(toastId);
        const newToastId = addToast('Getting fresh GPS location...', 'loading');
        
        result = await getLocation({
          minAccuracyThreshold: 100,
          requireHighAccuracy: true,
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
          console.warn('⚠️ SEVERE GPS ACCURACY:', result.accuracy);
          addToast(`GPS accuracy is ${Math.round(result.accuracy)}m - very poor. You may be indoors. Please move to open area and try again.`, 'error');
          setIsMarking(false);
          return;
        }
      }

      // أرسل البيانات للخادم
      const sendToastId = addToast('Sending to server...', 'loading');
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
      console.error('Attendance error:', errorMsg);
      removeToast(toastId);
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
                  <div>
                    <span className="px-4 py-2 rounded-full text-sm font-medium bg-emerald-600 text-white flex items-center gap-2">
                      ✓ Check-in
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
