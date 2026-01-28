'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, MapPin, Check } from 'lucide-react';
import { getDeviceId } from '@/lib/deviceId';

interface AttendanceRecord {
  _id: string;
  date: string;
  checkInTime: string;
  withinRadius: boolean;
  isLate: boolean;
  lateMinutes: number;
}

export default function SalesAttendance() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast, removeToast } = useToast();
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

      // Check if already marked today OR yesterday
      // (Early morning check-ins are recorded for the previous day)
      const today = new Date();
      const todayString = today.toDateString();
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toDateString();

      // Find record for today or yesterday
      const todayRecord = records.find((r: any) => {
        const recordDate = new Date(r.date).toDateString();
        return recordDate === todayString || recordDate === yesterdayString;
      });
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
          (err) => reject(err),
          {
            timeout: 10000,
            maximumAge: 0
          }
        );
      });

      console.log('User position:', { 
        latitude: position.latitude, 
        longitude: position.longitude,
        accuracy: position.accuracy 
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
          deviceId: getDeviceId(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to mark attendance');
      }

      const data = await res.json();
      
      console.log('===== ATTENDANCE RESPONSE =====');
      console.log('Full Response:', JSON.stringify(data, null, 2));
      console.log('isLate:', data.isLate, 'type:', typeof data.isLate);
      console.log('lateMinutes:', data.lateMinutes, 'type:', typeof data.lateMinutes);
      console.log('===============================');
      
      // Remove the loading toast
      removeToast(toastId);
      
      // Show appropriate message based on late status
      if (data.isLate === true) {
        console.log('CONDITION MET: User is late!');
        const hours = Math.floor(data.lateMinutes / 60);
        const minutes = data.lateMinutes % 60;
        let lateMessage = `⏰ You are ${minutes > 0 ? `${minutes} minute${minutes !== 1 ? 's' : ''}` : ''}${hours > 0 && minutes > 0 ? ' and ' : ''}${hours > 0 ? `${hours} hour${hours !== 1 ? 's' : ''}` : ''} late!`;
        console.log('Late message:', lateMessage);
        console.log('About to call addToast with warning type');
        addToast(lateMessage, 'warning');
        console.log('addToast called!');
      } else {
        console.log('CONDITION NOT MET: Showing success message');
        addToast('✅ Check-in marked today', 'success');
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
          <p className="text-slate-400">Check in using your GPS location</p>
        </div>

        {/* Attendance Button */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-2xl p-8 md:p-12 mb-12 text-center border border-slate-700 hover:border-blue-500 transition-all">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <MapPin size={40} className="text-white" />
          </div>

          <p className="text-slate-300 mb-8 text-lg">
            {todayAttendance
              ? '✅ Check-in marked today'
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
                Checked In
              </>
            ) : (
              <>
                <MapPin size={24} />
                Mark Attendance Now
              </>
            )}
          </button>
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
