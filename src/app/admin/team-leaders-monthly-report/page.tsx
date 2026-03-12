'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, Calendar, Users, ChevronDown, ChevronUp } from 'lucide-react';
import useLabels from '@/hooks/useLabels';

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

// Categories will be generated dynamically with labels
// const categories = [
//   { key: 'sheets', label: 'Sheets', color: 'blue' },
//   { key: 'assessments', label: 'Assessments', color: 'emerald' },
//   { key: 'meetings', label: 'Meetings', color: 'purple' },
//   { key: 'requests', label: 'Requests', color: 'orange' },
// ];

export default function TeamLeadersMonthlyReport() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const { get: getLabel } = useLabels();

  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<'sheets' | 'assessments' | 'meetings' | 'requests'>('sheets');
  const [leaderData, setLeaderData] = useState<TeamLeaderPerformance[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [savingData, setSavingData] = useState(false);
  const [expandedLeaders, setExpandedLeaders] = useState<Set<string>>(new Set());

  // Generate categories dynamically with labels from hook
  const categories = [
    { key: 'sheets', label: getLabel('sheets', 'Sheets'), color: 'blue' },
    { key: 'assessments', label: getLabel('assessments', 'Assessments'), color: 'emerald' },
    { key: 'meetings', label: getLabel('meetings', 'Meetings'), color: 'purple' },
    { key: 'requests', label: getLabel('requests', 'Requests'), color: 'orange' },
  ];

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
      const monthStr = `${selectedYear}-${selectedMonth}`;

      // Kick off all of the API requests in parallel to save round‑trip time
      const teamsPromise = fetch('/api/teams', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const perfPromise = fetch(
        `/api/admin/team-performance?month=${monthStr}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const leadsPromise = fetch('/api/leads', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const closedDealsPromise = fetch(`/api/closed-deals?month=${selectedYear}-${selectedMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const leaderPerfPromise = fetch(
        `/api/admin/team-leaders-performance?month=${monthStr}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const [
        teamsResponse,
        performanceResponse,
        leadsResponse,
        closedDealsResponse,
        leaderPerformanceResponse,
      ] = await Promise.all([
        teamsPromise,
        perfPromise,
        leadsPromise,
        closedDealsPromise,
        leaderPerfPromise,
      ]);

      if (!teamsResponse.ok) throw new Error('Failed to fetch teams');
      const teamsData = await teamsResponse.json();

      if (!performanceResponse.ok) throw new Error('Failed to fetch team performance');
      const performanceData = await performanceResponse.json();

      if (!leadsResponse.ok) throw new Error('Failed to fetch leads');
      const leadsData = await leadsResponse.json();

      const closedDealsData = closedDealsResponse.ok
        ? await closedDealsResponse.json()
        : { snapshots: [] };

      const leaderPerformanceData = leaderPerformanceResponse.ok
        ? await leaderPerformanceResponse.json()
        : { performances: [] };

      // Get team leaders
      const teamLeaders = teamsData.teams?.filter((team: any) => team.leader) || [];
      const leaderIds = teamLeaders.map((team: any) => team.leader.id);

      // Calculate leads and deals for the selected month
      const selectedMonthStart = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1);
      const selectedMonthEnd = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0);
      selectedMonthEnd.setHours(23, 59, 59, 999);
      const startTs = selectedMonthStart.getTime();
      const endTs = selectedMonthEnd.getTime();

      const leadsByEmployee = new Map<string, { leadsCount: number; dealsCount: number }>();

      // build an index of lead statuses so we can decide whether a snapshot should count
      const leadStatusById = new Map<string, string>();
      leadsData.leads?.forEach((lead: any) => {
        const idStr = lead._id ? String(lead._id) : null;
        if (idStr) {
          leadStatusById.set(idStr, lead.status);
        }

        const t = new Date(lead.createdAt).getTime();
        // Check if lead was created in the selected month (numeric compare saves allocations)
        if (t >= startTs && t <= endTs) {
          const rawEmployeeId = lead.assignedTo?._id || lead.assignedTo;
          const employeeId = rawEmployeeId ? String(rawEmployeeId) : null;
          if (!employeeId) return;
          if (!leadsByEmployee.has(employeeId)) {
            leadsByEmployee.set(employeeId, { leadsCount: 0, dealsCount: 0 });
          }
          leadsByEmployee.get(employeeId)!.leadsCount += 1;
        }
      });

      // Use closed-deals snapshots to count deals (preserves history even if Lead deleted)
      // however only tally a snapshot if its associated Lead is currently marked `closed`.
      // this mirrors the logic used on Manage Employees where deals = leads.status==='closed'.
      (closedDealsData.snapshots || []).forEach((snap: any) => {
        const rawAssigned = snap.assignedTo || snap.userId || null;
        const employeeId = rawAssigned ? String(rawAssigned) : null;
        if (!employeeId) return;

        // skip snapshots whose lead (if known) isn't fully closed
        if (snap.leadId) {
          const leadStatus = leadStatusById.get(String(snap.leadId));
          if (leadStatus && leadStatus !== 'closed') {
            return; // ignore pending‑approval, rejected, etc.
          }
        }

        if (!leadsByEmployee.has(employeeId)) {
          leadsByEmployee.set(employeeId, { leadsCount: 0, dealsCount: 0 });
        }
        const stats = leadsByEmployee.get(employeeId)!;
        stats.dealsCount += 1;
      });

      // Create map of team performance data by userId
      const performanceByEmployee = new Map<string, any>();
      performanceData.performances?.forEach((perf: any) => {
        const rawId = perf.userId && typeof perf.userId === 'object' ? perf.userId._id : perf.userId || null;
        if (!rawId) return;
        const employeeId = String(rawId);
        performanceByEmployee.set(employeeId, perf);
      });

      // Create map of team leader performance data by userId
      const leaderPerformanceByEmployee = new Map<string, any>();
      leaderPerformanceData.performances?.forEach((perf: any) => {
        const rawId = perf.userId;
        if (!rawId) return;
        const employeeId = String(rawId);
        leaderPerformanceByEmployee.set(employeeId, perf);
      });

      // Build data for team leaders
      const leaderData = teamLeaders.map((team: any) => {
        const leaderId = team.leader.id;
        const leaderName = team.leader.name;
        const perf = performanceByEmployee.get(leaderId);
        const leaderPerf = leaderPerformanceByEmployee.get(leaderId);
        const stats = leadsByEmployee.get(leaderId) || { leadsCount: 0, dealsCount: 0 };

        const days = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
        // don't prefill a map of zeros – we want missing entries to stay undefined
        const emptyDays: Record<string, number> = {};
        // (we keep `days` around for rendering but don't populate the object)

        // Use leader performance data if available, otherwise team performance
        // if neither has data we leave the map empty so inputs render blank
        const sheets = leaderPerf?.leaderPersonal?.sheets || perf?.sheets || emptyDays;
        const assessments = leaderPerf?.leaderPersonal?.assessments || perf?.assessments || emptyDays;
        const meetings = leaderPerf?.leaderPersonal?.meetings || perf?.meetings || emptyDays;
        const requests = leaderPerf?.leaderPersonal?.requests || perf?.requests || emptyDays;

        return {
          userId: leaderId,
          leaderName,
          month: monthStr,
          daysInMonth: days,
          sheets,
          assessments,
          meetings,
          requests,
          leaderPersonal: {
            sheets,
            assessments,
            meetings,
            requests,
          },
          aggregated: leaderPerf?.aggregated || {
            aggregatedLeads: stats.leadsCount,
            aggregatedDeals: stats.dealsCount,
            leaderLeads: stats.leadsCount,
            leaderDeals: stats.dealsCount,
          },
          leaderOwnLeads: stats.leadsCount,
          leaderOwnDeals: stats.dealsCount,
          teamLeadsCount: stats.leadsCount, // Simplified
          teamDealsCount: stats.dealsCount, // Simplified
        };
      });

      setLeaderData(leaderData);
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
        // send only the single changed day instead of entire month map
        [category]: {
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
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: Failed to save data`;
        throw new Error(errorMessage);
      }

      // ✅ Immediately update local state with the new value
      // This ensures the UI reflects the change right away
      setLeaderData((prevData) =>
        prevData.map((l) => {
          if (l.userId === leader.userId) {
            // Update the leaderPersonal data structure with new value
            return {
              ...l,
              leaderPersonal: {
                sheets:
                  category === 'sheets'
                    ? { ...(l.leaderPersonal?.sheets || {}), [day]: newValue }
                    : (l.leaderPersonal?.sheets || {}),
                assessments:
                  category === 'assessments'
                    ? { ...(l.leaderPersonal?.assessments || {}), [day]: newValue }
                    : (l.leaderPersonal?.assessments || {}),
                meetings:
                  category === 'meetings'
                    ? { ...(l.leaderPersonal?.meetings || {}), [day]: newValue }
                    : (l.leaderPersonal?.meetings || {}),
                requests:
                  category === 'requests'
                    ? { ...(l.leaderPersonal?.requests || {}), [day]: newValue }
                    : (l.leaderPersonal?.requests || {}),
              },
            };
          }
          return l;
        })
      );

      // ✅ After saving leader's own record, re-fetch to update team-aggregated buckets and verify save
      await fetchLeaderData();
      addToast('✅ Data saved successfully!', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error saving data:', message);
      addToast(`Error saving data: ${message}`, 'error');
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `HTTP ${response.status}: Failed to save data`;
        throw new Error(errorMessage);
      }

      // ✅ Pro-actively update state while fetching verification from API
      // This ensures UI is responsive even with network delays
      setLeaderData((prevData) =>
        prevData.map((l) => (l.userId === leader.userId ? leader : l))
      );

      // Then fetch fresh data from API for verification and aggregated updates
      await fetchLeaderData();
      addToast('✅ Data saved successfully!', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error saving data:', message);
      addToast(`Error saving data: ${message}`, 'error');
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

  const handleLocalChange = (
    userId: string,
    category: 'sheets' | 'assessments' | 'meetings' | 'requests',
    day: string,
    value: number | null
  ) => {
    setLeaderData((prev) =>
      prev.map((l) => {
        if (l.userId === userId) {
          const existing = l.leaderPersonal?.[category] || {};
          const updatedCategory = { ...existing } as Record<string, number>;

          if (value === null) {
            // delete the key when the input is cleared
            delete updatedCategory[day];
          } else {
            updatedCategory[day] = value;
          }

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

  // totals now return null when there is no recorded value at all
  const calculateTotal = (
    data?: Record<string, number> | null | number
  ): number | null => {
    if (typeof data === 'number') return data;
    if (!data || typeof data !== 'object') return null;
    const values = Object.values(data)
      .map(Number)
      .filter((v) => !isNaN(v));
    if (values.length === 0) return null;
    return values.reduce((sum, val) => sum + val, 0);
  };

  const calculateWeekTotal = (
    data: Record<string, number> = {},
    startDay: number,
    endDay: number
  ): number | null => {
    let total = 0;
    let hasValue = false;
    for (let i = startDay; i <= endDay; i++) {
      const v = data[`day${i}`];
      if (v != null) {
        hasValue = true;
        total += Number(v) || 0;
      }
    }
    return hasValue ? total : null;
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
                          (calculateTotal(leader.leaderPersonal?.sheets) || 0) +
                          (calculateTotal(leader.leaderPersonal?.assessments) || 0) +
                          (calculateTotal(leader.leaderPersonal?.meetings) || 0) +
                          (calculateTotal(leader.leaderPersonal?.requests) || 0);
                        return adminTotal > 0 ? (
                          <span className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg font-semibold">Admin Entries</span>
                        ) : null;
                      })()}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-xs text-slate-300 bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-600">
                        <span className="font-semibold">Team Leads:</span>{' '}
                        <span className="text-white">{leader.teamLeadsCount ?? leader.aggregated?.aggregatedLeads ?? ''}</span>
                      </div>

                      <div className="text-xs text-slate-300 bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-600">
                        <span className="font-semibold">Team Deals:</span>{' '}
                        <span className="text-white">{leader.teamDealsCount ?? leader.aggregated?.aggregatedDeals ?? ''}</span>
                      </div>

                      <div className="text-xs text-slate-300 bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-600">
                        <span className="font-semibold">Leader Leads:</span>{' '}
                        <span className="text-white">{leader.leaderOwnLeads ?? leader.aggregated?.leaderLeads ?? ''}</span>
                      </div>

                      <div className="text-xs text-slate-300 bg-slate-800/60 px-2 py-1 rounded-lg border border-slate-600">
                        <span className="font-semibold">Leader Deals:</span>{' '}
                        <span className="text-white">{leader.leaderOwnDeals ?? leader.aggregated?.leaderDeals ?? ''}</span>
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
                          const raw = leader.leaderPersonal?.[selectedCategory]?.[dayKey];
                          const value = raw != null ? raw : '';
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
                                onChange={(e) => {
                                  const txt = e.target.value;
                                  if (txt === '') {
                                    handleLocalChange(
                                      leader.userId,
                                      selectedCategory,
                                      dayKey,
                                      null
                                    );
                                  } else {
                                    handleLocalChange(
                                      leader.userId,
                                      selectedCategory,
                                      dayKey,
                                      Math.max(0, parseInt(txt) || 0)
                                    );
                                  }
                                }}
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
                              <div className={`text-xl sm:text-2xl font-bold text-${selectedCategoryObj?.color}-400`}>{weekTotal ?? ''}</div>
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

