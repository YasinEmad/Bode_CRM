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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Mark Attendance</h1>

        {/* Attendance Button */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8 text-center">
          <MapPin size={48} className="mx-auto text-blue-600 mb-4" />

          <p className="text-gray-600 mb-6">
            {todayAttendance
              ? 'Attendance already marked today'
              : 'Click the button below to mark your attendance using your GPS location'}
          </p>

          <button
            onClick={handleMarkAttendance}
            disabled={isMarking || !!todayAttendance}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 mb-4"
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
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p className="font-medium">Note: You were outside the allowed radius</p>
            </div>
          )}
        </div>

        {/* Attendance History */}
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Attendance</h2>

        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader size={32} className="animate-spin text-blue-600" />
          </div>
        ) : attendances.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600">No attendance records yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {attendances.slice(0, 10).map((record) => (
              <div
                key={record._id}
                className={`bg-white rounded-lg shadow-md p-4 border-l-4 ${
                  record.withinRadius ? 'border-green-500' : 'border-red-500'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {new Date(record.date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Check-in: {new Date(record.checkInTime).toLocaleTimeString()}
                      {record.checkOutTime &&
                        ` | Check-out: ${new Date(record.checkOutTime).toLocaleTimeString()}`}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      record.withinRadius
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {record.withinRadius ? 'Within Radius' : 'Outside Radius'}
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
