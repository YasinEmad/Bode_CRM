'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, Calendar, Users, ChevronDown, ChevronUp } from 'lucide-react';

interface TeamLeaderPerformance {
  userId: string;
  leaderName: string;
  month: string;
  daysInMonth: number;
  sheets: Record<string, number>;
  assessments: Record<string, number>;
  meetings: Record<string, number>;
  requests: Record<string, number>;
  leaderPersonal?: {
    sheets: Record<string, number>;
    assessments: Record<string, number>;
    meetings: Record<string, number>;
    requests: Record<string, number>;
  };
  aggregated?: {
    aggregatedLeads: number;
    aggregatedDeals: number;
    leaderLeads?: number;
    leaderDeals?: number;
  };
  leaderOwnLeads?: number;
  leaderOwnDeals?: number;
  teamLeadsCount?: number;
  teamDealsCount?: number;
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
];

export default function TeamLeadersMonthlyReport() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'sheets' | 'assessments' | 'meetings' | 'requests'>('sheets');
  const [leaderData, setLeaderData] = useState<TeamLeaderPerformance[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [expandedLeaders, setExpandedLeaders] = useState<Set<string>>(new Set());

  useEffect(() => {
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = now.getFullYear().toString();
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
  }, []);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/unauthorized');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (selectedMonth && selectedYear && token && user?.role === 'admin') {
      fetchLeaderData();
    }
  }, [selectedMonth, selectedYear, token, user]);

  const fetchLeaderData = async () => {
    try {
      setLoadingData(true);
      const response = await fetch(
        `/api/admin/team-leaders-performance?month=${selectedYear}-${selectedMonth}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch team leader data');
      }

      const data = await response.json();
      // Normalize to ensure UI only uses leaderPersonal (leader-only) buckets
      const normalized = (data.performances || []).map((p: any) => {
        const days = p.daysInMonth || 30;
        const emptyDays: Record<string, number> = {};
        for (let i = 1; i <= days; i++) emptyDays[`day${i}`] = 0;

        return {
          ...p,
          // clear team-aggregated buckets to avoid accidental display
          sheets: { ...emptyDays },
          assessments: { ...emptyDays },
          meetings: { ...emptyDays },
          requests: { ...emptyDays },
          // ensure leaderPersonal exists and has the four categories
          // merge saved values over zero-filled buckets so missing days show 0
          leaderPersonal: {
            sheets: { ...emptyDays, ...(p.leaderPersonal?.sheets || {}) },
            assessments: { ...emptyDays, ...(p.leaderPersonal?.assessments || {}) },
            meetings: { ...emptyDays, ...(p.leaderPersonal?.meetings || {}) },
            requests: { ...emptyDays, ...(p.leaderPersonal?.requests || {}) },
          },
        };
      });

      setLeaderData(normalized);
    } catch (error) {
      console.error('Error fetching team leader data:', error);
      addToast('Error loading team leader data', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  const updateCellValue = async (
    leader: TeamLeaderPerformance,
    category: 'sheets' | 'assessments' | 'meetings' | 'requests',
    day: string,
    newValue: number
  ) => {
    try {
      setSavingData(true);

      const updatedData = {
        userId: leader.userId,
        month: leader.month,
        [category]: {
          ...(leader.leaderPersonal?.[category] || {}),
          [day]: newValue,
        },
      };

      const response = await fetch('/api/admin/team-leaders-performance', {
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

      setLeaderData((prevData) =>
        prevData.map((l) => {
          if (l.userId === leader.userId) {
            const updatedCategory = {
              ...(l.leaderPersonal?.[category] || {}),
              [day]: newValue,
            };
            return {
              ...l,
              leaderPersonal: {
                sheets: category === 'sheets' ? updatedCategory : (l.leaderPersonal?.sheets || {}),
                assessments: category === 'assessments' ? updatedCategory : (l.leaderPersonal?.assessments || {}),
                meetings: category === 'meetings' ? updatedCategory : (l.leaderPersonal?.meetings || {}),
                requests: category === 'requests' ? updatedCategory : (l.leaderPersonal?.requests || {}),
              },
            };
          }
          return l;
        })
      );

      // After saving leader's own record, re-fetch to update team-aggregated buckets
      await fetchLeaderData();
      addToast('✅ Data saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving data:', error);
      addToast('Error saving data', 'error');
    } finally {
      setSavingData(false);
    }
  };

  const saveLeaderChanges = async (leader: TeamLeaderPerformance) => {
    try {
      setSavingData(true);

      const payload: any = {
        userId: leader.userId,
        month: leader.month,
      };

      payload[selectedCategory] = leader.leaderPersonal?.[selectedCategory] || {};

      const response = await fetch('/api/admin/team-leaders-performance', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to save data');

      await fetchLeaderData();
      addToast('✅ Data saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving data:', error);
      addToast('Error saving data', 'error');
    } finally {
      setSavingData(false);
    }
  };

  const toggleLeader = (leaderId: string) => {
    setExpandedLeaders((prev) => {
      const next = new Set(prev);
      if (next.has(leaderId)) next.delete(leaderId);
      else next.add(leaderId);
      return next;
    });
  };

  const handleLocalChange = (userId: string, category: 'sheets' | 'assessments' | 'meetings' | 'requests', day: string, value: number) => {
    setLeaderData((prev) =>
      prev.map((l) => {
        if (l.userId === userId) {
          const updatedCategory = {
            ...(l.leaderPersonal?.[category] || {}),
            [day]: value,
          };
          return {
            ...l,
            leaderPersonal: {
              sheets: category === 'sheets' ? updatedCategory : (l.leaderPersonal?.sheets || {}),
              assessments: category === 'assessments' ? updatedCategory : (l.leaderPersonal?.assessments || {}),
              meetings: category === 'meetings' ? updatedCategory : (l.leaderPersonal?.meetings || {}),
              requests: category === 'requests' ? updatedCategory : (l.leaderPersonal?.requests || {}),
            },
          };
        }
        return l;
      })
    );
  };

  const calculateTotal = (data?: Record<string, number> | null | number): number => {
    if (typeof data === 'number') return data;
    if (!data || typeof data !== 'object') return 0;
    return Object.values(data).reduce((sum, val) => sum + (Number(val) || 0), 0);
  };

  const calculateWeekTotal = (data: Record<string, number>, startDay: number, endDay: number): number => {
    let total = 0;
    for (let i = startDay; i <= endDay; i++) {
      total += data[`day${i}`] || 0;
    }
    return total;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  const selectedMonthName = months.find((m) => m.value === selectedMonth)?.name;
  const selectedCategoryObj = categories.find((c) => c.key === selectedCategory);

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
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-xl w-fit">
              <Users className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-1">Team Leaders Daily Report</h1>
              <p className="text-slate-400 text-sm sm:text-base">Track team leaders performance by day</p>
            </div>
          </div>
        </div>

        {/* Month/Year Selection */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-4 sm:p-6 mb-8 border border-slate-700">
          <div className="flex flex-col gap-4 sm:gap-6 sm:flex-row sm:items-end">
            <div className="w-full sm:flex-1">
              <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-2">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              >
                {months.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:flex-1">
              <label className="block text-xs sm:text-sm font-semibold text-slate-300 mb-2">Year</label>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <div className="w-full sm:w-auto flex items-center gap-2 bg-gradient-to-br from-indigo-600 to-indigo-500 px-4 py-3 rounded-lg border border-indigo-400 justify-center sm:justify-start">
              <Calendar size={20} className="text-white" />
              <span className="font-semibold text-white text-sm sm:text-base">
                {selectedMonthName} {selectedYear}
              </span>
            </div>
          </div>
        </div>

        {/* Category Selection */}
        <div className="mb-8 flex flex-wrap gap-2 sm:gap-3">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key as any)}
              className={`px-3 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-semibold transition ${
                selectedCategory === cat.key
                  ? `bg-${cat.color}-600 text-white shadow-lg`
                  : `bg-slate-800 text-slate-300 hover:bg-slate-700`
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-indigo-500" size={40} />
          </div>
        ) : leaderData.length === 0 ? (
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-12 text-center border border-slate-700">
            <p className="text-slate-400 text-lg">No team leaders found</p>
          </div>
        ) : (
          <div className="space-y-6">
            {leaderData.map((leader) => {
              const isExpanded = expandedLeaders.has(leader.userId);
              return (
              <div
                key={leader.userId}
                className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700"
              >
                {/* Leader Header */}
                <div
                  onClick={() => toggleLeader(leader.userId)}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 pb-4 border-b border-slate-600 gap-3 sm:gap-0 cursor-pointer select-none ${isExpanded ? 'bg-slate-700/40' : ''}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-2">
                      <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                        {isExpanded ? (
                          <ChevronUp size={18} className="text-slate-300" />
                        ) : (
                          <ChevronDown size={18} className="text-slate-300" />
                        )}
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-white line-clamp-1">{leader.leaderName}</h3>
                      {(() => {
                        const adminTotal =
                          calculateTotal(leader.leaderPersonal?.sheets) +
                          calculateTotal(leader.leaderPersonal?.assessments) +
                          calculateTotal(leader.leaderPersonal?.meetings) +
                          calculateTotal(leader.leaderPersonal?.requests);
                        return adminTotal > 0 ? (
                          <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg font-semibold">Admin Entries</span>
                        ) : null;
                      })()}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-xs text-slate-300 bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-600">
                        <span className="font-semibold">Team Leads:</span>{' '}
                        <span className="text-white">{leader.teamLeadsCount ?? leader.aggregated?.aggregatedLeads ?? 0}</span>
                      </div>

                      <div className="text-xs text-slate-300 bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-600">
                        <span className="font-semibold">Team Deals:</span>{' '}
                        <span className="text-white">{leader.teamDealsCount ?? leader.aggregated?.aggregatedDeals ?? 0}</span>
                      </div>

                      <div className="text-xs text-slate-300 bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-600">
                        <span className="font-semibold">Leader Leads:</span>{' '}
                        <span className="text-white">{leader.leaderOwnLeads ?? leader.aggregated?.leaderLeads ?? 0}</span>
                      </div>

                      <div className="text-xs text-slate-300 bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-600">
                        <span className="font-semibold">Leader Deals:</span>{' '}
                        <span className="text-white">{leader.leaderOwnDeals ?? leader.aggregated?.leaderDeals ?? 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-slate-400 text-xs sm:text-sm mb-1">Personal Total</p>
                    <p className={`text-2xl sm:text-3xl font-bold text-${selectedCategoryObj?.color}-400`}>
                      {calculateTotal(leader.leaderPersonal?.[selectedCategory])}
                    </p>
                  </div>
                </div>
                {/* Daily editable calendar-style grid (admin can edit any day) */}
                {isExpanded && (
                  <div className="mb-4 overflow-x-auto">
                    {!leader.leaderPersonal && (
                      <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-600 rounded text-yellow-200 text-xs sm:text-sm">
                        Warning: leaderPersonal data not available
                      </div>
                    )}

                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wide">Daily Performance</h4>
                      <div className="grid gap-1 sm:gap-2" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(50px, 1fr))'}}>
                        {Array.from({ length: leader.daysInMonth }).map((_, dayIndex) => {
                          const day = dayIndex + 1;
                          const dayKey = `day${day}`;
                          const value = leader.leaderPersonal?.[selectedCategory]?.[dayKey] || 0;
                          const dayOfWeek = new Date(parseInt(leader.month.split('-')[0]), parseInt(leader.month.split('-')[1]) - 1, day).toLocaleDateString('en-US', {
                            weekday: 'short',
                          });

                          return (
                            <div key={day} className={`bg-slate-900/50 rounded-lg p-1 sm:p-2 border-2 transition hover:shadow-lg` }>
                              <div className="text-xs text-slate-400 mb-1 font-semibold hidden sm:block">{dayOfWeek}</div>
                              <div className="text-xs text-slate-500 mb-1 sm:mb-2 font-semibold">{day}</div>
                              <input
                                type="number"
                                min={0}
                                value={value}
                                onChange={(e) =>
                                  handleLocalChange(
                                    leader.userId,
                                    selectedCategory,
                                    dayKey,
                                    Math.max(0, parseInt(e.target.value) || 0)
                                  )
                                }
                                // previously auto-saved on blur; now only update local state
                                className={`w-full px-1 py-1 sm:py-2 bg-gradient-to-br from-slate-700 to-slate-600 border border-slate-500 text-white rounded text-center text-sm sm:text-lg font-bold focus:outline-none focus:ring-2 transition ${
                                  selectedCategoryObj?.color === 'blue'
                                    ? 'focus:ring-blue-500'
                                    : selectedCategoryObj?.color === 'emerald'
                                    ? 'focus:ring-emerald-500'
                                    : selectedCategoryObj?.color === 'purple'
                                    ? 'focus:ring-purple-500'
                                    : 'focus:ring-orange-500'
                                }`}
                                title={''}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-end gap-3">
                      <button
                        onClick={() => saveLeaderChanges(leader)}
                        disabled={savingData}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${savingData ? 'opacity-60 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                      >
                        {savingData ? 'Saving...' : 'Save'}
                      </button>
                    </div>

                    {/* Weekly Summary */}
                    <div className="mt-4">
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wide">Weekly Summary</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                        {[1, 2, 3, 4].map((week) => {
                          const startDay = 1 + (week - 1) * 7;
                          const endDay = Math.min(week * 7, leader.daysInMonth);
                          const weekTotal = calculateWeekTotal(leader.leaderPersonal?.[selectedCategory] || {}, startDay, endDay);

                          return (
                            <div key={week} className={`bg-gradient-to-br from-slate-700 to-slate-600 rounded-lg p-2 sm:p-3 border-2 text-center`}>
                              <div className="text-xs sm:text-sm text-slate-300">Week {week}</div>
                              <div className={`text-xl sm:text-2xl font-bold text-${selectedCategoryObj?.color}-400`}>{weekTotal}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Weekly summaries removed - showing only leader personal daily table */}

              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

