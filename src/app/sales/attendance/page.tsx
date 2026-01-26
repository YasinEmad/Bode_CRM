'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, MapPin, Check } from 'lucide-react';

interface AttendanceRecord {
  _id: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  withinRadius: boolean;
}

export default function SalesAttendance() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast, updateToast } = useToast();
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [isMarking, setIsMarking] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'sales')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (token && user) {
      fetchAttendance();
    }
  }, [token, user]);

  const fetchAttendance = async () => {
    try {
      const res = await fetch(`/api/attendance?userId=${user?.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const records = Array.isArray(data.attendances) ? data.attendances : [];
      setAttendances(records);

      // Check if already marked today
      const today = new Date().toDateString();
      const todayRecord = records.find(
        (r: any) => new Date(r.date).toDateString() === today
      );
      setTodayAttendance(todayRecord || null);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleMarkAttendance = async () => {
    if (!navigator.geolocation) {
      addToast('Geolocation not supported on this device', 'error');
      return;
    }

    setIsMarking(true);
    const toastId = addToast('Getting your location...', 'loading');

    try {
      const position = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          (err) => reject(err)
        );
      });

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude: position.latitude,
          longitude: position.longitude,
        }),
      });

      if (!res.ok) throw new Error('Failed to mark attendance');

      const data = await res.json();

      if (data.withinRadius) {
        updateToast(toastId, '✓ Attendance marked successfully!', 'success');
      } else {
        updateToast(
          toastId,
          `⚠ You are ${data.distance}m away (allowed: ${data.allowedRadius}m)`,
          'error'
        );
      }

      fetchAttendance();
    } catch (error) {
      updateToast(
        toastId,
        error instanceof Error ? error.message : 'Failed to mark attendance',
        'error'
      );
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
          <p className="text-slate-400">Check in using your GPS location</p>
        </div>

        {/* Attendance Button */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-2xl p-8 md:p-12 mb-12 text-center border border-slate-700 hover:border-blue-500 transition-all">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <MapPin size={40} className="text-white" />
          </div>

          <p className="text-slate-300 mb-8 text-lg">
            {todayAttendance
              ? '✅ Attendance already marked today'
              : '📍 Click the button below to mark your attendance using your GPS location'}
          </p>

          <button
            onClick={handleMarkAttendance}
            disabled={isMarking || !!todayAttendance}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:bg-slate-600 text-white py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-3 mb-6 transition-all"
          >
            {isMarking ? (
              <>
                <Loader size={24} className="animate-spin" />
                Marking...
              </>
            ) : todayAttendance ? (
              <>
                <Check size={24} />
                Marked Today
              </>
            ) : (
              <>
                <MapPin size={24} />
                Mark Attendance Now
              </>
            )}
          </button>

          {todayAttendance && !todayAttendance.withinRadius && (
            <div className="bg-red-900 bg-opacity-40 border border-red-600 text-red-200 px-4 py-3 rounded-lg">
              <p className="font-medium">⚠ Note: You were outside the allowed radius</p>
            </div>
          )}
        </div>

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
                className={`bg-slate-800 rounded-2xl shadow-xl p-5 border-l-4 transition-all hover:shadow-2xl ${
                  record.withinRadius ? 'border-emerald-500 hover:border-emerald-400' : 'border-red-500 hover:border-red-400'
                } border border-slate-700`}
              >
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <div>
                    <p className="font-semibold text-white text-lg">
                      {new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-sm text-slate-400 mt-2">
                      🕐 Check-in: {new Date(record.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      {record.checkOutTime &&
                        ` | 🚪 Check-out: ${new Date(record.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
                      record.withinRadius
                        ? 'bg-emerald-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {record.withinRadius ? '✓ Within Radius' : '✗ Outside Radius'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
