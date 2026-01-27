'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, Calendar, Users, CheckCircle, Clock } from 'lucide-react';

interface AttendanceRecord {
  _id: string;
  userId: {
    _id: string;
    name: string;
  };
  date: string;
  checkInTime: string;
  isLate: boolean;
  lateMinutes: number;
  deviceId: string;
  withinRadius: boolean;
}

const months = [
  { name: 'January', value: '01' },
  { name: 'February', value: '02' },
  { name: 'March', value: '03' },
  { name: 'April', value: '04' },
  { name: 'May', value: '05' },
  { name: 'June', value: '06' },
  { name: 'July', value: '07' },
  { name: 'August', value: '08' },
  { name: 'September', value: '09' },
  { name: 'October', value: '10' },
  { name: 'November', value: '11' },
  { name: 'December', value: '12' },
];

export default function AttendanceRecords() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [employees, setEmployees] = useState<Map<string, string>>(new Map());

  // Set default month to current month
  useEffect(() => {
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = now.getFullYear().toString();
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
  }, []);

  // Check authentication
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/unauthorized');
    }
  }, [user, loading, router]);

  // Fetch attendance records when month/year changes
  useEffect(() => {
    if (selectedMonth && selectedYear && token) {
      fetchAttendanceRecords();
    }
  }, [selectedMonth, selectedYear, token]);

  const fetchAttendanceRecords = async () => {
    try {
      setLoadingRecords(true);
      const response = await fetch(
        `/api/admin/attendance-records?month=${selectedYear}-${selectedMonth}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch attendance records');
      }

      const data = await response.json();
      setAttendanceRecords(data.records || []);
      
      // Extract unique employees
      const employeeMap = new Map<string, string>();
      data.records?.forEach((record: AttendanceRecord) => {
        employeeMap.set(record.userId._id, record.userId.name);
      });
      setEmployees(employeeMap);
    } catch (error) {
      console.error('Error fetching records:', error);
      addToast('Error fetching attendance records', 'error');
    } finally {
      setLoadingRecords(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  const selectedMonthName = months.find(m => m.value === selectedMonth)?.name;
  const currentDaysInMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
  const daysArray = Array.from({ length: currentDaysInMonth }, (_, i) => i + 1);

  // Group records by employee for easier lookup
  const recordsByEmployee = new Map<string, Map<number, AttendanceRecord>>();
  attendanceRecords.forEach((record) => {
    const date = new Date(record.date);
    const day = date.getDate();
    
    if (!recordsByEmployee.has(record.userId._id)) {
      recordsByEmployee.set(record.userId._id, new Map());
    }
    recordsByEmployee.get(record.userId._id)!.set(day, record);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl">
              <Calendar className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-5xl font-bold text-white mb-1">Attendance Records</h1>
              <p className="text-slate-400">View daily attendance records for all employees</p>
            </div>
          </div>
        </div>

        {/* Month/Year Selection */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 mb-8 border border-slate-700">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              >
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Year
              </label>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div className="flex items-center gap-2 bg-gradient-to-br from-blue-600 to-blue-500 px-4 py-3 rounded-lg border border-blue-400">
              <Calendar size={20} className="text-white" />
              <span className="font-semibold text-white">
                {selectedMonthName} {selectedYear}
              </span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loadingRecords ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-blue-500" size={40} />
          </div>
        ) : recordsByEmployee.size === 0 ? (
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-12 text-center border border-slate-700">
            <p className="text-slate-400 text-lg">No attendance records found for this month</p>
          </div>
        ) : (
          <>
            {/* Attendance Table */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl overflow-x-auto border border-slate-700 mb-8">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-white">
                      Employee
                    </th>
                    {daysArray.map((day) => (
                      <th
                        key={day}
                        className="px-3 py-4 text-center text-xs font-bold text-slate-300 border-r border-slate-700"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(recordsByEmployee.entries()).map(
                    ([employeeId, dayRecords], index) => (
                      <tr
                        key={employeeId}
                        className={index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-700/50'}
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-white border-r border-slate-700 sticky left-0 bg-inherit z-10 whitespace-nowrap">
                          {employees.get(employeeId)}
                        </td>
                        {daysArray.map((day) => {
                          const record = dayRecords.get(day);
                          return (
                            <td
                              key={day}
                              className="px-3 py-4 text-center text-xs border-r border-slate-700 bg-inherit hover:bg-slate-600/30 transition"
                            >
                              {record ? (
                                <div className="space-y-2">
                                  <div
                                    className={`inline-block px-3 py-1.5 rounded-full text-white font-bold text-xs ${
                                      record.isLate ? 'bg-orange-500' : 'bg-emerald-500'
                                    }`}
                                  >
                                    {record.isLate ? 'Late' : 'Present'}
                                  </div>
                                  {record.isLate && (
                                    <div className="text-orange-400 font-bold text-xs">
                                      +{record.lateMinutes} min
                                    </div>
                                  )}
                                  <div className="text-slate-400 text-xs font-medium">
                                    {new Date(record.checkInTime).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: false,
                                    })}
                                  </div>
                                  {record.deviceId && (
                                    <div className="text-slate-500 text-xs truncate" title={record.deviceId}>
                                      {record.deviceId.substring(0, 8)}...
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-block px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 font-bold text-xs">
                                  Absent
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700 hover:shadow-2xl hover:border-blue-500 transition-all group">
                <h3 className="text-slate-400 text-sm font-bold mb-3 uppercase tracking-wide">Total Records</h3>
                <div className="flex items-center justify-between">
                  <p className="text-4xl font-bold text-white">{attendanceRecords.length}</p>
                  <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl p-3 group-hover:scale-110 transition-transform">
                    <Calendar size={24} className="text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700 hover:shadow-2xl hover:border-purple-500 transition-all group">
                <h3 className="text-slate-400 text-sm font-bold mb-3 uppercase tracking-wide">Employees</h3>
                <div className="flex items-center justify-between">
                  <p className="text-4xl font-bold text-white">{employees.size}</p>
                  <div className="bg-gradient-to-br from-purple-600 to-purple-500 rounded-xl p-3 group-hover:scale-110 transition-transform">
                    <Users size={24} className="text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700 hover:shadow-2xl hover:border-emerald-500 transition-all group">
                <h3 className="text-slate-400 text-sm font-bold mb-3 uppercase tracking-wide">On Time</h3>
                <div className="flex items-center justify-between">
                  <p className="text-4xl font-bold text-white">
                    {attendanceRecords.filter(r => !r.isLate).length}
                  </p>
                  <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-xl p-3 group-hover:scale-110 transition-transform">
                    <CheckCircle size={24} className="text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700 hover:shadow-2xl hover:border-orange-500 transition-all group">
                <h3 className="text-slate-400 text-sm font-bold mb-3 uppercase tracking-wide">Late</h3>
                <div className="flex items-center justify-between">
                  <p className="text-4xl font-bold text-white">
                    {attendanceRecords.filter(r => r.isLate).length}
                  </p>
                  <div className="bg-gradient-to-br from-orange-600 to-orange-500 rounded-xl p-3 group-hover:scale-110 transition-transform">
                    <Clock size={24} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
