'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, Calendar, Users, CheckCircle, Clock, Download } from 'lucide-react';
import { countWorkdaysInMonth, countDaysInMonth } from '@/lib/workdays';
import { exportAttendanceToExcel } from '@/lib/exportExcel';

interface AttendanceRecord {
  _id: string;
  userId?: {
    _id: string;
    name: string;
  } | null;
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
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    action?: 'mark_present' | 'mark_on_time';
    employeeId?: string;
    day?: number;
    record?: AttendanceRecord | null;
  }>({ isOpen: false, action: undefined, employeeId: undefined, day: undefined, record: null });

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
      
      // Extract unique employees (guard when userId is missing)
      const employeeMap = new Map<string, string>();
      data.records?.forEach((record: AttendanceRecord) => {
        const uid = record.userId && typeof record.userId === 'object' ? record.userId._id : null;
        const name = record.userId && typeof record.userId === 'object' ? record.userId.name : (record as any).userName || 'Unknown';
        if (uid) {
          employeeMap.set(uid, name);
        }
      });
      setEmployees(employeeMap);
    } catch (error) {
      console.error('Error fetching records:', error);
      addToast('Error fetching attendance records', 'error');
    } finally {
      setLoadingRecords(false);
    }
  };

  // Calculate attendance percentage for an employee in the selected month
  const calculateAttendancePercentage = (employeeId: string): number => {
    const dayRecords = recordsByEmployee.get(employeeId);
    if (!dayRecords || dayRecords.size === 0) return 0;

    const presentDays = dayRecords.size;
    const totalWorkDays = currentDaysInMonth;

    return Math.round((presentDays / totalWorkDays) * 100);
  };

  // Calculate total late minutes for an employee in the selected month
  const calculateTotalLateMinutes = (employeeId: string): number => {
    const dayRecords = recordsByEmployee.get(employeeId);
    if (!dayRecords || dayRecords.size === 0) return 0;

    let totalLate = 0;
    dayRecords.forEach((record) => {
      if (record.isLate) {
        totalLate += record.lateMinutes;
      }
    });

    return totalLate;
  };

  const handleExportToExcel = () => {
    if (attendanceRecords.length === 0) {
      addToast('No records to export', 'error');
      return;
    }

    const exportData = attendanceRecords.map((record) => ({
      'Employee Name': record.userId && typeof record.userId === 'object' && record.userId.name ? record.userId.name : (record as any).userName || 'Unknown',
      'Date': new Date(record.date).toLocaleDateString('en-US'),
      'Check-In Time': new Date(record.checkInTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      'Status': record.isLate ? 'Late' : 'Present',
      'Late Minutes': record.isLate ? record.lateMinutes : 0,
      'Device ID': record.deviceId || 'N/A',
    }));

    exportAttendanceToExcel(
      exportData,
      `attendance_${selectedYear}-${selectedMonth}`
    );
    addToast('✅ Attendance records exported successfully!', 'success');
  };

  const sendPatch = async (payload: any) => {
    if (!token) {
      addToast('Unauthorized', 'error');
      return null;
    }

    try {
      const res = await fetch('/api/admin/attendance-records', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error || 'Failed to update record');
      }

      return await res.json();
    } catch (error: any) {
      console.error('Patch error:', error);
      addToast(error.message || 'Update failed', 'error');
      return null;
    }
  };

  const markPresent = async (employeeId: string, day: number) => {
    // Open confirmation modal instead of using browser confirm
    setConfirmModal({ isOpen: true, action: 'mark_present', employeeId, day, record: null });
  };

  const markOnTime = async (record: AttendanceRecord, employeeId: string, day: number) => {
    // Open confirmation modal instead of using browser confirm
    setConfirmModal({ isOpen: true, action: 'mark_on_time', employeeId, day, record });
  };

  const executeConfirmedAction = async () => {
    if (!confirmModal.action) return;

    if (confirmModal.action === 'mark_present') {
      if (!selectedYear || !selectedMonth || !confirmModal.employeeId || !confirmModal.day) return;
      const dateStr = `${selectedYear}-${selectedMonth}-${String(confirmModal.day).padStart(2, '0')}`;
      const result = await sendPatch({ action: 'mark_present', userId: confirmModal.employeeId, date: dateStr });
      if (result?.success) {
        addToast('Absence has been converted to presence', 'success');
        fetchAttendanceRecords();
      }
    }

    if (confirmModal.action === 'mark_on_time') {
      const payload: any = { action: 'mark_on_time' };
      if (confirmModal.record && (confirmModal.record as any)._id) payload.recordId = (confirmModal.record as any)._id;
      else {
        if (!selectedYear || !selectedMonth || !confirmModal.employeeId || !confirmModal.day) return;
        payload.userId = confirmModal.employeeId;
        payload.date = `${selectedYear}-${selectedMonth}-${String(confirmModal.day).padStart(2, '0')}`;
      }

      const result = await sendPatch(payload);
      if (result?.success) {
        addToast('Late record has been converted to on-time', 'success');
        fetchAttendanceRecords();
      }
    }

    setConfirmModal({ isOpen: false, action: undefined, employeeId: undefined, day: undefined, record: null });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  const selectedMonthName = months.find(m => m.value === selectedMonth)?.name;
  // Show full calendar days in month for the attendance table
  const currentDaysInMonth = selectedYear && selectedMonth
    ? countDaysInMonth(parseInt(selectedYear), parseInt(selectedMonth) - 1)
    : 0;
  const daysArray = Array.from({ length: currentDaysInMonth }, (_, i) => i + 1);

  // Group records by employee for easier lookup
  const recordsByEmployee = new Map<string, Map<number, AttendanceRecord>>();
  attendanceRecords.forEach((record) => {
    const date = new Date(record.date);
    const day = date.getDate();
    const uid = record.userId && typeof record.userId === 'object' ? record.userId._id : null;
    if (!uid) return; // skip records without user reference

    if (!recordsByEmployee.has(uid)) {
      recordsByEmployee.set(uid, new Map());
    }
    recordsByEmployee.get(uid)!.set(day, record);
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
            {/* Confirmation Modal */}
            {confirmModal.isOpen && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700 overflow-hidden">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-600/20 to-blue-600/10 border-b border-blue-500/30 px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-500/20 p-3 rounded-lg">
                        <Calendar className="text-blue-400" size={24} />
                      </div>
                      <h3 className="text-xl font-bold text-white"> Confirm Action</h3>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-6 space-y-4">
                    <p className="text-slate-300">
                      {confirmModal.action === 'mark_present'
                        ? 'Do you want to convert this day\'s absence to presence?'
                        : 'Do you want to convert this late record to on-time?'}
                    </p>
                    <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                      <p className="text-xs text-slate-400 mb-2">Employee:</p>
                      <p className="text-sm font-semibold text-white mb-1">{confirmModal.employeeId ? employees.get(confirmModal.employeeId) : ''}</p>
                      <p className="text-xs text-slate-400">today:</p>
                      <p className="text-sm font-mono text-white">{confirmModal.day}</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex gap-3 px-6 py-4 border-t border-slate-700 bg-slate-900/50">
                    <button
                      onClick={() => setConfirmModal({ isOpen: false, action: undefined, employeeId: undefined, day: undefined, record: null })}
                      className="flex-1 px-4 py-2 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-700/50 hover:text-white transition-all font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={executeConfirmedAction}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-600 transition-all font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/50"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Month/Year Selection */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 mb-8 border border-slate-700">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-end justify-between">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-end flex-1">
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

            {/* Export Button */}
            <button
              onClick={handleExportToExcel}
              disabled={loadingRecords || attendanceRecords.length === 0}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:from-slate-600 disabled:to-slate-600 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap"
            >
              <Download size={20} />
              Export to Excel
            </button>
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
                    <th className="px-6 py-4 text-center text-sm font-bold text-white border-l border-slate-700 bg-blue-600/20">
                      Attendance %
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-white border-l border-slate-700 bg-orange-600/20">
                      Total Late (min)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(recordsByEmployee.entries()).map(
                    ([employeeId, dayRecords], index) => {
                      const attendancePercentage = calculateAttendancePercentage(employeeId);
                      const totalLateMinutes = calculateTotalLateMinutes(employeeId);

                      return (
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
                                      onClick={() => record.isLate && markOnTime(record, employeeId, day)}
                                      className={`inline-block px-3 py-1.5 rounded-full text-white font-bold text-xs ${
                                        record.isLate ? 'bg-orange-500 cursor-pointer hover:opacity-90' : 'bg-emerald-500'
                                      }`}
                                      title={record.isLate ? 'انقر لتحويل المتأخر إلى حضر في الموعد' : ''}
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
                                        hour12: true,
                                      })}
                                    </div>
                                    {record.deviceId && (
                                      <div className="text-slate-500 text-xs truncate" title={record.deviceId}>
                                        {record.deviceId.substring(0, 8)}...
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span
                                    onClick={() => markPresent(employeeId, day)}
                                    className="inline-block px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 font-bold text-xs cursor-pointer hover:bg-red-500/30"
                                    title="انقر لتحويل الغياب إلى حضور"
                                  >
                                    Absent
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          {/* Attendance Percentage Column */}
                          <td className="px-6 py-4 text-center border-l border-slate-700 bg-blue-600/10">
                            <div className="inline-block bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl px-4 py-3 text-center">
                              <p className="text-2xl font-bold text-white">{attendancePercentage}%</p>
                              <p className="text-xs text-blue-100 mt-1">Attendance</p>
                            </div>
                          </td>
                          {/* Total Late Minutes Column */}
                          <td className="px-6 py-4 text-center border-l border-slate-700 bg-orange-600/10">
                            <div className="inline-block bg-gradient-to-br from-orange-600 to-orange-500 rounded-xl px-4 py-3 text-center">
                              <p className="text-2xl font-bold text-white">{totalLateMinutes}</p>
                              <p className="text-xs text-orange-100 mt-1">Total Minutes</p>
                            </div>
                          </td>
                        </tr>
                      );
                    }
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
