'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, Calendar, BarChart3 } from 'lucide-react';

interface PerformanceData {
  userId: string;
  name: string;
  month: string;
  calls: {
    week1: number;
    week2: number;
    week3: number;
    week4: number;
  };
  assessments: {
    week1: number;
    week2: number;
    week3: number;
    week4: number;
  };
  meetings: {
    week1: number;
    week2: number;
    week3: number;
    week4: number;
  };
  requests: {
    week1: number;
    week2: number;
    week3: number;
    week4: number;
  };
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

export default function TeamReport() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [teamData, setTeamData] = useState<PerformanceData[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [savingData, setSavingData] = useState(false);

  // Set default month to current month
  useEffect(() => {
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = now.getFullYear().toString();
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
  }, []);

  // Check authentication - must be team leader
  useEffect(() => {
    if (!loading && (!user || user.role !== 'sales')) {
      router.push('/unauthorized');
    }
  }, [user, loading, router]);

  // Fetch team data when month/year changes
  useEffect(() => {
    if (selectedMonth && selectedYear && token && user?.role === 'sales') {
      fetchTeamData();
    }
  }, [selectedMonth, selectedYear, token, user]);

  const fetchTeamData = async () => {
    try {
      setLoadingData(true);
      const response = await fetch(
        `/api/teams/performance?month=${selectedYear}-${selectedMonth}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          router.push('/unauthorized');
          return;
        }
        throw new Error('Failed to fetch team data');
      }

      const data = await response.json();

      // Map the response to include member names
      const formattedData: PerformanceData[] = data.performances.map((perf: any, index: number) => ({
        userId: perf.userId,
        name: data.teamMembers[index]?.name || 'Unknown',
        month: perf.month,
        calls: perf.calls,
        assessments: perf.assessments,
        meetings: perf.meetings,
        requests: perf.requests || { week1: 0, week2: 0, week3: 0, week4: 0 },
      }));

      setTeamData(formattedData);
    } catch (error) {
      console.error('Error fetching team data:', error);
      addToast('Error loading team data', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  const updateCellValue = async (
    employeeData: PerformanceData,
    category: 'calls' | 'assessments' | 'meetings' | 'requests',
    week: 'week1' | 'week2' | 'week3' | 'week4',
    newValue: number
  ) => {
    try {
      setSavingData(true);

      const updatedData = {
        userId: employeeData.userId,
        month: employeeData.month,
        [category]: {
          ...employeeData[category],
          [week]: newValue,
        },
      };

      const response = await fetch('/api/teams/performance', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        throw new Error('Failed to save data');
      }

      // Update local state
      setTeamData((prevData) =>
        prevData.map((emp) =>
          emp.userId === employeeData.userId
            ? {
                ...emp,
                [category]: {
                  ...emp[category],
                  [week]: newValue,
                },
              }
            : emp
        )
      );

      addToast('✅ Data saved successfully!', 'success');
      setEditingCell(null);
    } catch (error) {
      console.error('Error saving data:', error);
      addToast('Error saving data', 'error');
    } finally {
      setSavingData(false);
    }
  };

  const calculateTotal = (data: Record<string, number>): number => {
    return Object.values(data).reduce((sum, val) => sum + val, 0);
  };

  const handleInputChange = (
    employeeIndex: number,
    category: 'calls' | 'assessments' | 'meetings' | 'requests',
    week: 'week1' | 'week2' | 'week3' | 'week4',
    value: string
  ) => {
    const newValue = Math.max(0, parseInt(value) || 0);
    const employee = teamData[employeeIndex];

    updateCellValue(employee, category, week, newValue);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  const selectedMonthName = months.find((m) => m.value === selectedMonth)?.name;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <style>{`
        input[type="number"]::-webkit-outer-spin-button,
        input[type="number"]::-webkit-inner-spin-button {
          -webkit-appearance: none !important;
          margin: 0 !important;
          display: none !important;
        }
        input[type="number"] {
          -moz-appearance: textfield !important;
        }
      `}</style>
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-cyan-600 to-cyan-500 rounded-xl">
              <BarChart3 className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-5xl font-bold text-white mb-1">Team Report</h1>
              <p className="text-slate-400">Track team performance metrics and weekly activities</p>
            </div>
          </div>
        </div>

        {/* Month/Year Selection */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 mb-8 border border-slate-700">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-end">
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-end flex-1">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
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
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                />
              </div>

              <div className="flex items-center gap-2 bg-gradient-to-br from-cyan-600 to-cyan-500 px-4 py-3 rounded-lg border border-cyan-400">
                <Calendar size={20} className="text-white" />
                <span className="font-semibold text-white">
                  {selectedMonthName} {selectedYear}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-cyan-500" size={40} />
          </div>
        ) : teamData.length === 0 ? (
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-12 text-center border border-slate-700">
            <p className="text-slate-400 text-lg">No team members found</p>
          </div>
        ) : (
          <>
            {/* Team Performance Table */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl overflow-x-auto border border-slate-700">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-white">
                      Employee
                    </th>

                    {/* Calls Section */}
                    <th colSpan={5} className="px-6 py-4 text-center text-sm font-bold text-white border-l border-slate-700 bg-blue-600/20">
                      Calls
                    </th>

                    {/* Assessments Section */}
                    <th colSpan={5} className="px-6 py-4 text-center text-sm font-bold text-white border-l border-slate-700 bg-emerald-600/20">
                      Assessments
                    </th>

                    {/* Meetings Section */}
                    <th colSpan={5} className="px-6 py-4 text-center text-sm font-bold text-white border-l border-slate-700 bg-purple-600/20">
                      Meetings
                    </th>

                    {/* Requests Section */}
                    <th colSpan={5} className="px-6 py-4 text-center text-sm font-bold text-white border-l border-slate-700 bg-orange-600/20">
                      Requests
                    </th>
                  </tr>

                  {/* Week Headers */}
                  <tr className="border-b border-slate-700">
                    <th className="px-6 py-2 text-xs font-semibold text-slate-400"></th>

                    {/* Calls Weeks */}
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-300 border-l border-slate-700 bg-blue-600/20">
                      W1
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-300 border-l border-slate-700 bg-blue-600/20">
                      W2
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-300 border-l border-slate-700 bg-blue-600/20">
                      W3
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-300 border-l border-slate-700 bg-blue-600/20">
                      W4
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-blue-300 border-l border-slate-700 bg-blue-600/30">
                      Total
                    </th>

                    {/* Assessments Weeks */}
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-300 border-l border-slate-700 bg-emerald-600/20">
                      W1
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-300 border-l border-slate-700 bg-emerald-600/20">
                      W2
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-300 border-l border-slate-700 bg-emerald-600/20">
                      W3
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-300 border-l border-slate-700 bg-emerald-600/20">
                      W4
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-emerald-300 border-l border-slate-700 bg-emerald-600/30">
                      Total
                    </th>

                    {/* Meetings Weeks */}
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-300 border-l border-slate-700 bg-purple-600/20">
                      W1
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-300 border-l border-slate-700 bg-purple-600/20">
                      W2
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-300 border-l border-slate-700 bg-purple-600/20">
                      W3
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-300 border-l border-slate-700 bg-purple-600/20">
                      W4
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-purple-300 border-l border-slate-700 bg-purple-600/30">
                      Total
                    </th>

                    {/* Requests Weeks */}
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-300 border-l border-slate-700 bg-orange-600/20">
                      W1
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-300 border-l border-slate-700 bg-orange-600/20">
                      W2
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-300 border-l border-slate-700 bg-orange-600/20">
                      W3
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-300 border-l border-slate-700 bg-orange-600/20">
                      W4
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-orange-300 border-l border-slate-700 bg-orange-600/30">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {teamData.map((employee, empIndex) => (
                    <tr
                      key={employee.userId}
                      className={empIndex % 2 === 0 ? 'bg-slate-800' : 'bg-slate-700/50'}
                    >
                      {/* Employee Name */}
                      <td className="px-6 py-4 text-sm font-semibold text-white border-r border-slate-700 sticky left-0 bg-inherit z-10 whitespace-nowrap">
                        {employee.name}
                      </td>

                      {/* Calls Section */}
                      <td className="px-3 py-4 text-center border-l border-slate-700 bg-blue-600/10">
                        <input
                          type="number"
                          min="0"
                          value={employee.calls.week1}
                          onChange={(e) =>
                            handleInputChange(empIndex, 'calls', 'week1', e.target.value)
                          }
                          className="w-12 px-2 py-1 bg-slate-700 border border-slate-600 text-white rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-4 text-center border-l border-slate-700 bg-blue-600/10">
                        <input
                          type="number"
                          min="0"
                          value={employee.calls.week2}
                          onChange={(e) =>
                            handleInputChange(empIndex, 'calls', 'week2', e.target.value)
                          }
                          className="w-12 px-2 py-1 bg-slate-700 border border-slate-600 text-white rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-4 text-center border-l border-slate-700 bg-blue-600/10">
                        <input
                          type="number"
                          min="0"
                          value={employee.calls.week3}
                          onChange={(e) =>
                            handleInputChange(empIndex, 'calls', 'week3', e.target.value)
                          }
                          className="w-12 px-2 py-1 bg-slate-700 border border-slate-600 text-white rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-4 text-center border-l border-slate-700 bg-blue-600/10">
                        <input
                          type="number"
                          min="0"
                          value={employee.calls.week4}
                          onChange={(e) =>
                            handleInputChange(empIndex, 'calls', 'week4', e.target.value)
                          }
                          className="w-12 px-2 py-1 bg-slate-700 border border-slate-600 text-white rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-4 text-center border-l border-slate-700 bg-blue-600/30">
                        <span className="inline-block bg-gradient-to-br from-blue-600 to-blue-500 text-white px-3 py-1 rounded font-bold text-sm">
                          {calculateTotal(employee.calls)}
                        </span>
                      </td>

                      {/* Assessments Section */}
                      <td className="px-3 py-4 text-center border-l border-slate-700 bg-emerald-600/10">
                        <input
                          type="number"
                          min="0"
                          value={employee.assessments.week1}
                          onChange={(e) =>
                            handleInputChange(empIndex, 'assessments', 'week1', e.target.value)
                          }
                          className="w-12 px-2 py-1 bg-slate-700 border border-slate-600 text-white rounded text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-4 text-center border-l border-slate-700 bg-emerald-600/10">
                        <input
                          type="number"
                          min="0"
                          value={employee.assessments.week2}
                          onChange={(e) =>
                            handleInputChange(empIndex, 'assessments', 'week2', e.target.value)
                          }
                          className="w-12 px-2 py-1 bg-slate-700 border border-slate-600 text-white rounded text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-4 text-center border-l border-slate-700 bg-emerald-600/10">
                        <input
                          type="number"
                          min="0"
                          value={employee.assessments.week3}
                          onChange={(e) =>
                            handleInputChange(empIndex, 'assessments', 'week3', e.target.value)
                          }
                          className="w-12 px-2 py-1 bg-slate-700 border border-slate-600 text-white rounded text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-4 text-center border-l border-slate-700 bg-emerald-600/10">
                        <input
                          type="number"
                          min="0"
                          value={employee.assessments.week4}
                          onChange={(e) =>
                            handleInputChange(empIndex, 'assessments', 'week4', e.target.value)
                          }
                          className="w-12 px-2 py-1 bg-slate-700 border border-slate-600 text-white rounded text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-4 text-center border-l border-slate-700 bg-emerald-600/30">
                        <span className="inline-block bg-gradient-to-br from-emerald-600 to-emerald-500 text-white px-3 py-1 rounded font-bold text-sm">
                          {calculateTotal(employee.assessments)}
                        </span>
                      </td>

                      {/* Meetings Section */}
                      <td className="px-3 py-4 text-center border-l border-slate-700 bg-purple-600/10">
                        <input
                          type="number"
                          min="0"
                          value={employee.meetings.week1}
                          onChange={(e) =>
                            handleInputChange(empIndex, 'meetings', 'week1', e.target.value)
                          }
                          className="w-12 px-2 py-1 bg-slate-700 border border-slate-600 text-white rounded text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-3 py-4 text-center border-l border-slate-700 bg-purple-600/10">
                        <input
                          type="number"
                          min="0"
                          value={employee.meetings.week2}
                          onChange={(e) =>
                            handleInputChange(empIndex, 'meetings', 'week2', e.target.value)
                          }
                          className="w-12 px-2 py-1 bg-slate-700 border border-slate-600 text-white rounded text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-3 py-4 text-center border-l border-slate-700 bg-purple-600/10">
                        <input
                          type="number"
                          min="0"
                          value={employee.meetings.week3}
                          onChange={(e) =>
                            handleInputChange(empIndex, 'meetings', 'week3', e.target.value)
                          }
                          className="w-12 px-2 py-1 bg-slate-700 border border-slate-600 text-white rounded text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-3 py-4 text-center border-l border-slate-700 bg-purple-600/10">
                        <input
                          type="number"
                          min="0"
                          value={employee.meetings.week4}
                          onChange={(e) =>
                            handleInputChange(empIndex, 'meetings', 'week4', e.target.value)
                          }
                          className="w-12 px-2 py-1 bg-slate-700 border border-slate-600 text-white rounded text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </td>
                      <td className="px-3 py-4 text-center border-l border-slate-700 bg-purple-600/30">
                        <span className="inline-block bg-gradient-to-br from-purple-600 to-purple-500 text-white px-3 py-1 rounded font-bold text-sm">
                          {calculateTotal(employee.meetings)}
                        </span>
                      </td>

                      {/* Requests Section */}
                      <td className="px-3 py-4 text-center border-l border-slate-700 bg-orange-600/10">
                        <input
                          type="number"
                          min="0"
                          value={employee.requests.week1}
                          onChange={(e) =>
                            handleInputChange(empIndex, 'requests', 'week1', e.target.value)
                          }
                          className="w-12 px-2 py-1 bg-slate-700 border border-slate-600 text-white rounded text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-3 py-4 text-center border-l border-slate-700 bg-orange-600/10">
                        <input
                          type="number"
                          min="0"
                          value={employee.requests.week2}
                          onChange={(e) =>
                            handleInputChange(empIndex, 'requests', 'week2', e.target.value)
                          }
                          className="w-12 px-2 py-1 bg-slate-700 border border-slate-600 text-white rounded text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-3 py-4 text-center border-l border-slate-700 bg-orange-600/10">
                        <input
                          type="number"
                          min="0"
                          value={employee.requests.week3}
                          onChange={(e) =>
                            handleInputChange(empIndex, 'requests', 'week3', e.target.value)
                          }
                          className="w-12 px-2 py-1 bg-slate-700 border border-slate-600 text-white rounded text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-3 py-4 text-center border-l border-slate-700 bg-orange-600/10">
                        <input
                          type="number"
                          min="0"
                          value={employee.requests.week4}
                          onChange={(e) =>
                            handleInputChange(empIndex, 'requests', 'week4', e.target.value)
                          }
                          className="w-12 px-2 py-1 bg-slate-700 border border-slate-600 text-white rounded text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-3 py-4 text-center border-l border-slate-700 bg-orange-600/30">
                        <span className="inline-block bg-gradient-to-br from-orange-600 to-orange-500 text-white px-3 py-1 rounded font-bold text-sm">
                          {calculateTotal(employee.requests)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Saving Indicator */}
            {savingData && (
              <div className="fixed bottom-6 right-6 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
                <Loader className="animate-spin" size={16} />
                <span>Saving...</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
