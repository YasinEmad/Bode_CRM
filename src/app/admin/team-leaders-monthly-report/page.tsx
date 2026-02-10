'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, Calendar, Users } from 'lucide-react';

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
  { key: 'leads', label: 'Leads', color: 'pink' },
  { key: 'deals', label: 'Deals', color: 'cyan' },
];

export default function TeamLeadersMonthlyReport() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'sheets' | 'assessments' | 'meetings' | 'requests' | 'leads' | 'deals'>('sheets');
  const [leaderData, setLeaderData] = useState<TeamLeaderPerformance[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [savingData, setSavingData] = useState(false);

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
      setLeaderData(data.performances);
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
          ...leader[category],
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
        prevData.map((l) =>
          l.userId === leader.userId
            ? {
                ...l,
                [category]: {
                  ...l[category],
                  [day]: newValue,
                },
              }
            : l
        )
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
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-xl">
              <Users className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-5xl font-bold text-white mb-1">Team Leaders Daily Report</h1>
              <p className="text-slate-400">Track team leaders performance by day</p>
            </div>
          </div>
        </div>

        {/* Month/Year Selection */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 mb-8 border border-slate-700">
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Month</label>
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

            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Year</label>
              <input
                type="number"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <div className="flex items-center gap-2 bg-gradient-to-br from-indigo-600 to-indigo-500 px-4 py-3 rounded-lg border border-indigo-400">
              <Calendar size={20} className="text-white" />
              <span className="font-semibold text-white">
                {selectedMonthName} {selectedYear}
              </span>
            </div>
          </div>
        </div>

        {/* Category Selection */}
        <div className="mb-8 flex flex-wrap gap-3">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key as any)}
              className={`px-6 py-3 rounded-lg font-semibold transition ${
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
            {leaderData.map((leader) => (
              <div
                key={leader.userId}
                className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700"
              >
                {/* Leader Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-600">
                  <h3 className="text-2xl font-bold text-white">{leader.leaderName}</h3>
                  <div className="text-right">
                    <p className="text-slate-400 text-sm mb-2">Personal / Team Total</p>
                    <p className={`text-3xl font-bold text-${selectedCategoryObj?.color}-400`}>
                      {selectedCategory === 'leads'
                        ? `${leader.aggregated?.leaderLeads ?? 0} / ${leader.aggregated?.aggregatedLeads ?? 0}`
                        : selectedCategory === 'deals'
                        ? `${leader.aggregated?.leaderDeals ?? 0} / ${leader.aggregated?.aggregatedDeals ?? 0}`
                        : `${calculateTotal(leader.leaderPersonal?.[selectedCategory])} / ${calculateTotal(leader[selectedCategory])}`}
                    </p>
                  </div>
                </div>

                {/* Display Content - Leads & Deals or Daily Grid */}
                {(selectedCategory === 'leads' || selectedCategory === 'deals') ? (
                  // Aggregated Display for Leads and Deals
                  <div className="bg-slate-900/30 rounded-lg p-6 border border-slate-600 text-center">
                    <p className="text-slate-400 text-sm mb-4">Team {selectedCategory === 'leads' ? 'Leads' : 'Deals'} for {selectedMonthName} {selectedYear}</p>
                    <p className={`text-5xl font-bold text-${selectedCategoryObj?.color}-400 mb-2`}>
                      {selectedCategory === 'leads'
                        ? `${leader.aggregated?.leaderLeads ?? 0} (team: ${leader.aggregated?.aggregatedLeads ?? 0})`
                        : `${leader.aggregated?.leaderDeals ?? 0} (team: ${leader.aggregated?.aggregatedDeals ?? 0})`}
                    </p>
                    <p className="text-slate-500 text-sm">
                      {selectedCategory === 'leads' 
                        ? 'Total leads assigned to team members for this month'
                        : 'Total deals closed by team members for this month'}
                    </p>
                  </div>
                ) : (
                  // Daily Grid - Calendar View for other categories
                  <>
                    {/* Debug: Show if personal data exists */}
                    {!leader.leaderPersonal && (
                      <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-600 rounded text-yellow-200 text-sm">
                        Warning: leaderPersonal data not available
                      </div>
                    )}

                    {/* Leader's Personal Data Section */}
                    <div className="mb-8">
                      <h4 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-slate-600">
                        👤 {leader.leaderName}'s Personal Performance
                      </h4>
                      <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: leader.daysInMonth }).map((_, dayIndex) => {
                          const day = dayIndex + 1;
                          const dayKey = `day${day}`;
                          const personalData = leader.leaderPersonal?.[selectedCategory] || {};
                          const value = personalData[dayKey] || 0;
                          const dayOfWeek = new Date(parseInt(leader.month.split('-')[0]), parseInt(leader.month.split('-')[1]) - 1, day).toLocaleDateString('en-US', {
                            weekday: 'short',
                          });

                          return (
                            <div
                              key={`personal-${day}`}
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
                                onChange={(e) =>
                                  updateCellValue(
                                    leader,
                                    selectedCategory,
                                    dayKey,
                                    Math.max(0, parseInt(e.target.value) || 0)
                                  )
                                }
                                className={`w-full px-1 py-2 bg-gradient-to-br from-slate-700 to-slate-600 border border-slate-500 text-white rounded text-center text-lg font-bold focus:outline-none focus:ring-2 transition ${
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

                    {/* Team Aggregated Data Section */}
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-slate-600">
                        👥 Team Aggregated Performance (Leader + All Members)
                      </h4>
                      <div className="grid grid-cols-7 gap-2">
                        {Array.from({ length: leader.daysInMonth }).map((_, dayIndex) => {
                          const day = dayIndex + 1;
                          const dayKey = `day${day}`;
                          const value = leader[selectedCategory][dayKey] || 0;
                          const dayOfWeek = new Date(parseInt(leader.month.split('-')[0]), parseInt(leader.month.split('-')[1]) - 1, day).toLocaleDateString('en-US', {
                            weekday: 'short',
                          });

                          return (
                            <div
                              key={`team-${day}`}
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
                              <div className={`w-full px-1 py-2 bg-gradient-to-br from-slate-700 to-slate-600 border border-slate-500 text-white rounded text-center text-lg font-bold`}>
                                {value}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* Weekly Summary - Only for non-aggregated categories */}
                {selectedCategory !== 'leads' && selectedCategory !== 'deals' && (
                  <>
                    {/* Leader's Personal Weekly Summary */}
                    <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-600 mb-6">
                      <h4 className="text-sm font-semibold text-slate-300 mb-3">📊 {leader.leaderName}'s Weekly Summary</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map((week) => {
                          const startDay = 1 + (week - 1) * 7;
                          const endDay = Math.min(week * 7, leader.daysInMonth);
                          const weekTotal = calculateWeekTotal(leader.leaderPersonal?.[selectedCategory] || {}, startDay, endDay);

                          return (
                            <div
                              key={`leader-week-${week}`}
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

                    {/* Team Aggregated Weekly Summary */}
                    <div className="bg-slate-900/30 rounded-lg p-4 border border-slate-600">
                      <h4 className="text-sm font-semibold text-slate-300 mb-3">📊 Team Weekly Summary (Leader + All Members)</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map((week) => {
                          const startDay = 1 + (week - 1) * 7;
                          const endDay = Math.min(week * 7, leader.daysInMonth);
                          const weekTotal = calculateWeekTotal(leader[selectedCategory], startDay, endDay);

                          return (
                            <div
                              key={`team-week-${week}`}
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
                  </>
                )}
            
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

