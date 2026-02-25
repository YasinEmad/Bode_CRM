'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, MapPin, Check } from 'lucide-react';
import MarkAttendanceCard from '@/components/MarkAttendanceCard';
import { getDeviceId, generateDeviceId, setDeviceId } from '@/lib/deviceId';
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

        <MarkAttendanceCard initialTodayAttendance={todayAttendance} onMarked={fetchAttendance} />

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

      
    </div>
  );
}
