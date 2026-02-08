'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, Calendar, BarChart3, ChevronDown } from 'lucide-react';

interface PerformanceData {
  userId: string;
  name: string;
  month: string;
  daysInMonth: number;
  sheets: Record<string, number>;
  assessments: Record<string, number>;
  meetings: Record<string, number>;
  requests: Record<string, number>;
  aggregated?: boolean;
  leaderPersonal?: boolean;
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

const categories = [
  { key: 'sheets', label: 'Sheets', color: 'blue' },
  { key: 'assessments', label: 'Assessments', color: 'emerald' },
  { key: 'meetings', label: 'Meetings', color: 'purple' },
  { key: 'requests', label: 'Requests', color: 'orange' },
] as const;

export default function TeamReport() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'sheets' | 'assessments' | 'meetings' | 'requests'>('sheets');
  const [teamData, setTeamData] = useState<PerformanceData[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [savingData, setSavingData] = useState(false);

  // Derived state for UI logic
  const selectedCategoryObj = categories.find((c) => c.key === selectedCategory);

  useEffect(() => {
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = now.getFullYear().toString();
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
  }, []);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'sales')) {
      router.push('/unauthorized');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (selectedMonth && selectedYear && token && user?.role === 'sales') {
      fetchTeamData();
    }
  }, [selectedMonth, selectedYear, token, user]);

  // Helper Functions
  const calculateTotal = (record: Record<string, number> = {}) => {
    return Object.values(record).reduce((sum, val) => sum + (val || 0), 0);
  };

  const calculateWeekTotal = (record: Record<string, number> = {}, start: number, end: number) => {
    let total = 0;
    for (let i = start; i <= end; i++) {
      const dayKey = `day${i}`;
      total += record[dayKey] || 0;
    }
    return total;
  };

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

      const formattedData: PerformanceData[] = data.performances.map((perf: any) => ({
        userId: perf.userId,
        name: perf.name || 'Unknown',
        month: perf.month,
        daysInMonth: perf.daysInMonth,
        sheets: perf.sheets,
        assessments: perf.assessments,
        meetings: perf.meetings,
        requests: perf.requests,
      }));

      // Add aggregated row if present
      if (data.aggregatedLeader) {
        const agg = data.aggregatedLeader;
        formattedData.unshift({
          userId: String(agg.userId),
          name: agg.name || 'Team Totals',
          month: agg.month,
          daysInMonth: agg.daysInMonth,
          sheets: agg.sheets,
          assessments: agg.assessments,
          meetings: agg.meetings,
          requests: agg.requests,
          aggregated: true,
        });
      }

      // Add leader personal row if present
      if (data.leaderPersonal) {
        const lp = data.leaderPersonal;
        const formattedLeader: PerformanceData = {
          userId: String(lp.userId),
          name: (lp.name || 'Leader') + ' (You)',
          month: lp.month,
          daysInMonth: lp.daysInMonth,
          sheets: lp.sheets,
          assessments: lp.assessments,
          meetings: lp.meetings,
          requests: lp.requests,
          leaderPersonal: true,
        };
        if (formattedData.length > 0 && formattedData[0].aggregated) {
          formattedData.splice(1, 0, formattedLeader);
        } else {
          formattedData.unshift(formattedLeader);
        }
      }

      setTeamData(formattedData);
    } catch (error) {
      console.error('Error fetching team data:', error);
      addToast('Error loading team data', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  const updateCellValue = async (
    employee: PerformanceData,
    category: 'sheets' | 'assessments' | 'meetings' | 'requests',
    day: string,
    newValue: number
  ) => {
    try {
      setSavingData(true);

      const updatedData = {
        userId: employee.userId,
        month: employee.month,
        [category]: {
          ...employee[category],
          [day]: newValue,
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

      setTeamData((prevData) =>
        prevData.map((emp) =>
          emp.userId === employee.userId
            ? {
                ...emp,
                [category]: {
                  ...emp[category],
                  [day]: newValue,
                },
              }
            : emp
        )
      );
      addToast('✅ Data saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving data:', error);
      addToast('Error saving data', 'error');
    } finally {
      setSavingData(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader className="animate-spin text-white" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-8 pb-24 text-white">
      <div className="max-w-7xl mx-auto">
        
        {/* Header and Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-3">
              <BarChart3 className="text-blue-400" />
              Team Performance Report
            </h1>
            <p className="text-slate-400 mt-2">Manage and view your team's monthly metrics.</p>
          </div>

          <div className="flex gap-4">
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none bg-slate-900 border border-slate-700 text-white pl-4 pr-10 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>{m.name}</option>
                ))}
              </select>
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>

            <div className="relative">
               <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="appearance-none bg-slate-900 border border-slate-700 text-white pl-4 pr-10 py-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                {[2024, 2025, 2026].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {categories.map((cat) => {
            const activeClass = 'bg-' + cat.color + '-500/10 border-' + cat.color + '-500 ring-1 ring-' + cat.color + '-500';
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key as any)}
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  selectedCategory === cat.key ? activeClass : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                }`}
              >
                <div className="font-semibold text-lg">{cat.label}</div>
                <div className={`text-sm ${selectedCategory === cat.key ? ('text-' + cat.color + '-400') : 'text-slate-500'}`}>
                  {selectedCategory === cat.key ? 'Active View' : 'Switch View'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        {loadingData ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader className="animate-spin mb-4" size={48} />
            <p>Loading team metrics...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {teamData.map((employee) => {
              const computedKey = `${employee.userId}-${employee.aggregated ? 'agg' : employee.leaderPersonal ? 'personal' : 'member'}`;
              return (
                <div
                  key={computedKey}
                  className={
                    employee.aggregated
                      ? 'bg-gradient-to-br from-yellow-900 to-yellow-800 rounded-2xl shadow-2xl p-6 border-2 border-yellow-500'
                      : 'bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700'
                  }
                >
                  {/* Employee Header */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-600">
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-bold text-white">{employee.name}</h3>
                      {employee.aggregated && (
                        <span className="text-xs bg-yellow-500 text-black px-2 py-1 rounded-lg font-semibold">Aggregated (Team + Admin + Leader)</span>
                      )}
                      {employee.leaderPersonal && (
                        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-lg">Your Entries</span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-sm mb-2">Total</p>
                      <p className={`text-3xl font-bold text-${selectedCategoryObj?.color}-400`}>
                        {calculateTotal(employee[selectedCategory])}
                      </p>
                    </div>
                  </div>

                  {/* Daily Grid - Calendar View */}
                  <div className="mb-6">
                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: employee.daysInMonth }).map((_, dayIndex) => {
                        const day = dayIndex + 1;
                        const dayKey = `day${day}`;
                        const value = employee[selectedCategory][dayKey] || 0;
                        const dayOfWeek = new Date(parseInt(employee.month.split('-')[0]), parseInt(employee.month.split('-')[1]) - 1, day).toLocaleDateString('en-US', {
                          weekday: 'short',
                        });

                        return (
                          <div
                            key={day}
                            className={`bg-slate-900/50 rounded-lg p-2 border-2 transition hover:shadow-lg ${
                              value > 0
                                ? selectedCategoryObj?.color === 'blue'
                                  ? 'border-blue-500 bg-blue-500/10'
                                  : selectedCategoryObj?.color === 'emerald'
                                  ? 'border-emerald-500 bg-emerald-500/10'
                                  : selectedCategoryObj?.color === 'purple'
                                  ? 'border-purple-500 bg-purple-500/10'
                                  : 'border-orange-500 bg-orange-500/10'
                                : 'border-slate-600 hover:border-slate-500'
                            }`}
                          >
                            <div className="text-xs text-slate-400 mb-1 font-semibold">{dayOfWeek}</div>
                            <div className="text-xs text-slate-500 mb-2">{day}</div>
                            <input
                              type="number"
                              min="0"
                              value={value}
                              disabled={!!employee.aggregated}
                              onChange={(e) => {
                                if (employee.aggregated) return;
                                updateCellValue(
                                  employee,
                                  selectedCategory,
                                  dayKey,
                                  Math.max(0, parseInt(e.target.value) || 0)
                                );
                              }}
                              className={`w-full px-1 py-2 ${employee.aggregated ? 'bg-yellow-800 border-yellow-600 text-yellow-100' : 'bg-gradient-to-br from-slate-700 to-slate-600 border border-slate-500 text-white'} rounded text-center text-lg font-bold focus:outline-none focus:ring-2 transition ${
                                selectedCategoryObj?.color === 'blue'
                                  ? 'focus:ring-blue-500'
                                  : selectedCategoryObj?.color === 'emerald'
                                  ? 'focus:ring-emerald-500'
                                  : selectedCategoryObj?.color === 'purple'
                                  ? 'focus:ring-purple-500'
                                  : 'focus:ring-orange-500'
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Weekly Summary */}
                  <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-600">
                    <h4 className="text-sm font-semibold text-slate-300 mb-3">Weekly Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[1, 2, 3, 4].map((week) => {
                        const startDay = 1 + (week - 1) * 7;
                        const endDay = Math.min(week * 7, employee.daysInMonth);
                        const weekTotal = calculateWeekTotal(employee[selectedCategory], startDay, endDay);

                        return (
                          <div
                            key={week}
                            className={`bg-gradient-to-br from-slate-700 to-slate-600 rounded-lg p-3 border-2 text-center ${
                              selectedCategoryObj?.color === 'blue'
                                ? 'border-blue-500/50'
                                : selectedCategoryObj?.color === 'emerald'
                                ? 'border-emerald-500/50'
                                : selectedCategoryObj?.color === 'purple'
                                ? 'border-purple-500/50'
                                : 'border-orange-500/50'
                            }`}
                          >
                            <p className="text-xs text-slate-300 mb-2">Week {week}</p>
                            <p className={`text-2xl font-bold text-${selectedCategoryObj?.color}-400`}>{weekTotal}</p>
                            <p className="text-xs text-slate-400 mt-1">Days {startDay}-{endDay}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Saving Indicator */}
        {savingData && (
          <div className="fixed bottom-6 right-6 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50">
            <Loader className="animate-spin" size={16} />
            <span>Saving...</span>
          </div>
        )}
      </div>
    </div>
  );
}