'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, Calendar, TrendingUp, Users, Download, AlertCircle } from 'lucide-react';
import { calculateEmployeeKPI, EmployeeMetrics, KPIScores } from '@/lib/kpiCalculator';
import { countWorkdaysInMonth } from '@/lib/workdays';

interface EmployeeReportData {
  _id: string;
  name: string;
  position: string;
  salary: number;
  leadsCount: number;
  closedDealsCount: number;
  attendancePercentage: number;
  sheetsCount: number;
  meetingsCount: number;
  assessmentsCount: number;
  requestsCount: number;
  kpiPercentage: number;
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

export default function MonthlyEmployeeReport() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [reportData, setReportData] = useState<EmployeeReportData[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [kpiSettings, setKpiSettings] = useState<any>(null);
  const [kpiLoadError, setKpiLoadError] = useState<string | null>(null);

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

  // Fetch report data when month/year changes
  useEffect(() => {
    if (selectedMonth && selectedYear && token) {
      const loadData = async () => {
        // Fetch KPI settings first
        console.log('🔄 Starting data load sequence...');
        const kpiData = await fetchKpiSettingsAndReturn();
        // Then fetch report data with the KPI settings
        await fetchReportDataWithKpi(kpiData);
      };
      loadData();
    }
  }, [selectedMonth, selectedYear, token]);

  const fetchKpiSettings = async () => {
    try {
      console.log('📊 Fetching KPI settings...');
      const res = await fetch('/api/kpi-settings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('❌ KPI API Error:', res.status, errorData);
        setKpiLoadError(errorData.error || 'Failed to load KPI settings');
        setKpiSettings(null);
        return;
      }

      const data = await res.json();
      console.log('✅ KPI settings received:', data.kpiSettings);
      
      // Validate KPI settings structure
      if (!data.kpiSettings) {
        console.error('❌ No kpiSettings object in response');
        setKpiLoadError('Invalid KPI settings format');
        return;
      }

      if (!Array.isArray(data.kpiSettings.indicators)) {
        console.error('❌ Indicators is not an array');
        setKpiLoadError('Invalid indicators format');
        return;
      }

      if (data.kpiSettings.indicators.length === 0) {
        console.error('❌ No indicators in settings');
        setKpiLoadError('No indicators configured');
        return;
      }

      // Validate all required indicators are present
      // requests is optional for backward compatibility
      const requiredIndicators = ['attendance', 'deals', 'sheets', 'meetings', 'assessments'];
      const providedIndicators = data.kpiSettings.indicators.map((ind: any) => ind.name);
      const missingIndicators = requiredIndicators.filter(ind => !providedIndicators.includes(ind));

      if (missingIndicators.length > 0) {
        console.error('❌ Missing indicators:', missingIndicators);
        setKpiLoadError(`Missing indicators: ${missingIndicators.join(', ')}`);
        return;
      }

      // Validate total weight
      const totalWeight = data.kpiSettings.indicators.reduce((sum: number, ind: any) => sum + ind.weight, 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        console.error('❌ Invalid total weight:', totalWeight);
        setKpiLoadError(`Total weight must be 100%, got ${totalWeight.toFixed(2)}%`);
        return;
      }

      console.log('✅ KPI settings validated successfully');
      console.log('   - Indicators:', providedIndicators.join(', '));
      console.log('   - Total Weight:', totalWeight.toFixed(2) + '%');
      setKpiSettings(data.kpiSettings);
      setKpiLoadError(null);
    } catch (error) {
      console.error('❌ Error fetching KPI settings:', error);
      setKpiLoadError(error instanceof Error ? error.message : 'Failed to load KPI settings');
      setKpiSettings(null);
    }
  };

  // New function: Fetch KPI settings and return the data
  const fetchKpiSettingsAndReturn = async (): Promise<any> => {
    try {
      console.log('📊 Fetching KPI settings...');
      // Fetch both global and team-leader settings so we can apply team-leader logic where needed
      const [globalRes, leaderRes] = await Promise.all([
        fetch('/api/kpi-settings', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/kpi-settings?role=team-leader', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!globalRes.ok) {
        const err = await globalRes.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load global KPI settings');
      }

      if (leaderRes.status !== 200 && leaderRes.status !== 404 && !leaderRes.ok) {
        const err = await leaderRes.json().catch(() => ({}));
        console.warn('Warning: failed to load team-leader KPI settings', err);
      }

      const globalData = await globalRes.json();
      const leaderData = leaderRes.ok ? await leaderRes.json() : null;
      console.log('✅ KPI settings received: global:', globalData.kpiSettings, 'team-leader:', leaderData?.kpiSettings);

      const data = globalData; // base validations against global
      if (!data.kpiSettings || !Array.isArray(data.kpiSettings.indicators) || data.kpiSettings.indicators.length === 0) {
        console.error('❌ Invalid KPI settings format');
        setKpiLoadError('Invalid KPI settings format');
        return;
      }

      // Validate all required indicators are present
      const requiredIndicators = ['attendance', 'deals', 'sheets', 'meetings', 'assessments'];
      const providedIndicators = data.kpiSettings.indicators.map((ind: any) => ind.name);
      const missingIndicators = requiredIndicators.filter(ind => !providedIndicators.includes(ind));

      if (missingIndicators.length > 0) {
        console.error('❌ Missing indicators:', missingIndicators);
        setKpiLoadError(`Missing indicators: ${missingIndicators.join(', ')}`);
        return;
      }

      // Validate total weight
      const totalWeight = data.kpiSettings.indicators.reduce((sum: number, ind: any) => sum + ind.weight, 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        console.error('❌ Invalid total weight:', totalWeight);
        setKpiLoadError(`Total weight must be 100%, got ${totalWeight.toFixed(2)}%`);
        return;
      }

      console.log('✅ KPI settings validated successfully');
      console.log('   - Indicators:', providedIndicators.join(', '));
      console.log('   - Total Weight:', totalWeight.toFixed(2) + '%');
      setKpiSettings(data.kpiSettings);
      setKpiLoadError(null);
      // Return both global and team-leader settings to caller
      return { global: data.kpiSettings, teamLeader: leaderData?.kpiSettings || null };
    } catch (error) {
      console.error('❌ Error fetching KPI settings:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to load KPI settings';
      setKpiLoadError(errorMsg);
      setKpiSettings(null);
      return null;
    }
  };

  // New function: Fetch report data with KPI settings already available
  const fetchReportDataWithKpi = async (kpiSettingsData: any) => {
    try {
      setLoadingReport(true);

      // Fetch all employees
      const employeesResponse = await fetch('/api/employees', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!employeesResponse.ok) {
        throw new Error('Failed to fetch employees');
      }

      const employeesData = await employeesResponse.json();

      // Fetch all leads for the month
      const leadsResponse = await fetch('/api/leads', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!leadsResponse.ok) {
        throw new Error('Failed to fetch leads');
      }

      const leadsData = await leadsResponse.json();

      // Fetch attendance records for the selected month
      const attendanceResponse = await fetch(
        `/api/admin/attendance-records?month=${selectedYear}-${selectedMonth}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!attendanceResponse.ok) {
        throw new Error('Failed to fetch attendance records');
      }

      const attendanceData = await attendanceResponse.json();

      // Fetch team performance data for the selected month (for team members)
      const performanceResponse = await fetch(
        `/api/admin/team-performance?month=${selectedYear}-${selectedMonth}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!performanceResponse.ok) {
        throw new Error('Failed to fetch team performance');
      }

      const performanceData = await performanceResponse.json();

      // Fetch team leader performance data for the selected month
      const leaderPerformanceResponse = await fetch(
        `/api/admin/team-leaders-performance?month=${selectedYear}-${selectedMonth}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!leaderPerformanceResponse.ok) {
        throw new Error('Failed to fetch team leader performance');
      }

      const leaderPerformanceData = await leaderPerformanceResponse.json();

      // Calculate leads and deals for the selected month
      const selectedMonthStart = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1);
      const selectedMonthEnd = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0);
      selectedMonthEnd.setHours(23, 59, 59, 999);

      const leadsByEmployee = new Map<string, { leadsCount: number; dealsCount: number }>();
      
      leadsData.leads?.forEach((lead: any) => {
        const leadDate = new Date(lead.createdAt);
        
        // Check if lead was created in the selected month
        if (leadDate >= selectedMonthStart && leadDate <= selectedMonthEnd) {
          const employeeId = lead.assignedTo?._id || lead.assignedTo;
          
          if (!leadsByEmployee.has(employeeId)) {
            leadsByEmployee.set(employeeId, { leadsCount: 0, dealsCount: 0 });
          }
          
          const stats = leadsByEmployee.get(employeeId)!;
          stats.leadsCount += 1;
          
          // Count as deal only if status is 'closed'
          if (lead.status === 'closed') {
            stats.dealsCount += 1;
          }
        }
      });

      // Create map of team performance data by userId (guard when userId is missing)
      const performanceByEmployee = new Map<string, any>();
      performanceData.performances?.forEach((perf: any) => {
        const employeeId = perf.userId && typeof perf.userId === 'object' ? perf.userId._id : perf.userId || null;
        if (employeeId) {
          performanceByEmployee.set(employeeId, perf);
        }
      });

      // Create map of team leader performance data by userId (guard when userId is missing)
      // Store both explicit (admin-edited) and aggregated data so UI can choose appropriately.
      const leaderPerformanceByEmployee = new Map<string, { explicit?: any; aggregated?: any }>();
      leaderPerformanceData.performances?.forEach((perf: any) => {
        const employeeId = perf.userId && typeof perf.userId === 'object' ? perf.userId._id : perf.userId || null;
        if (!employeeId) return;

        const explicit = (
          (perf.sheets && Object.keys(perf.sheets).length > 0) ||
          (perf.meetings && Object.keys(perf.meetings).length > 0) ||
          (perf.assessments && Object.keys(perf.assessments).length > 0) ||
          (perf.requests && Object.keys(perf.requests).length > 0)
        )
          ? perf
          : undefined;

        const aggregated = perf.aggregated ? perf.aggregated : undefined;

        leaderPerformanceByEmployee.set(employeeId, { explicit, aggregated });
      });

      // Calculate attendance percentage for each employee
      // currentDaysInMonth now represents working days in the month (Friday excluded)
      const currentDaysInMonth = countWorkdaysInMonth(parseInt(selectedYear), parseInt(selectedMonth) - 1);
      const attendanceByEmployee = new Map<string, { presentDays: number; lateMinutes: number }>();

      attendanceData.records?.forEach((record: any) => {
        const employeeId = record.userId && typeof record.userId === 'object' ? record.userId._id : record.userId || null;
        if (!employeeId) return; // skip records with missing user
        if (!attendanceByEmployee.has(employeeId)) {
          attendanceByEmployee.set(employeeId, { presentDays: 0, lateMinutes: 0 });
        }
        const data = attendanceByEmployee.get(employeeId)!;
        data.presentDays += 1;
        if (record.isLate) {
          data.lateMinutes += record.lateMinutes;
        }
      });

      // Calculate totals from team performance (null-safe)
      const calculateTotal = (data?: Record<string, number> | null): number => {
        if (!data || typeof data !== 'object') return 0;
        return Object.values(data).reduce((sum, val) => sum + (Number(val) || 0), 0);
      };

      // Build report data
      const report: EmployeeReportData[] = employeesData.employees.map((emp: any) => {
        const leadsStats = leadsByEmployee.get(emp._id) || { leadsCount: 0, dealsCount: 0 };
        const attendanceStats = attendanceByEmployee.get(emp._id) || { presentDays: 0, lateMinutes: 0 };
        const performanceStats = performanceByEmployee.get(emp._id);
        const leaderStats = leaderPerformanceByEmployee.get(emp._id);
        
        const isLeaderAggregatedLeads = aggregatedLeader && typeof aggregatedLeader.aggregatedLeads === 'number';
        const isLeaderAggregatedDeals = aggregatedLeader && typeof aggregatedLeader.aggregatedDeals === 'number';
        const attendancePercentage = currentDaysInMonth > 0
          ? Math.round((attendanceStats.presentDays / currentDaysInMonth) * 100)
          : 0;

        // Get sheets, meetings, assessments, requests from team performance (team members)
        // If not found, check team leader performance (for team leaders)
        // Prefer leader aggregated totals (if provided by admin API) over personal team performance
        // For leader rows: prefer explicit admin-edited values for daily metrics; fall back to personal/team performance.
        const explicitLeader = leaderStats && (leaderStats as any).explicit ? (leaderStats as any).explicit : null;
        const aggregatedLeader = leaderStats && (leaderStats as any).aggregated ? (leaderStats as any).aggregated : null;

        const sheetsCount = explicitLeader
          ? calculateTotal(explicitLeader.sheets)
          : performanceStats
          ? calculateTotal(performanceStats.sheets)
          : 0;

        const meetingsCount = explicitLeader
          ? calculateTotal(explicitLeader.meetings)
          : performanceStats
          ? calculateTotal(performanceStats.meetings)
          : 0;

        const assessmentsCount = explicitLeader
          ? calculateTotal(explicitLeader.assessments)
          : performanceStats
          ? calculateTotal(performanceStats.assessments)
          : 0;

        const requestsCount = explicitLeader
          ? calculateTotal(explicitLeader.requests)
          : performanceStats
          ? calculateTotal(performanceStats.requests)
          : 0;

        // For team leaders prefer the Aggregated totals (Team + Admin + Leader) for leads/deals.
        // Fall back to explicit leaderOwn fields (admin edits) or personal leads count.
        const finalLeadsCount = aggregatedLeader && typeof aggregatedLeader.aggregatedLeads === 'number'
          ? aggregatedLeader.aggregatedLeads
          : typeof (explicitLeader as any)?.leaderOwnLeads === 'number'
          ? (explicitLeader as any).leaderOwnLeads
          : leadsStats.leadsCount;

        const finalDealsCount = aggregatedLeader && typeof aggregatedLeader.aggregatedDeals === 'number'
          ? aggregatedLeader.aggregatedDeals
          : typeof (explicitLeader as any)?.leaderOwnDeals === 'number'
          ? (explicitLeader as any).leaderOwnDeals
          : leadsStats.dealsCount;

        // Calculate KPI if settings are available (now we may have global and teamLeader bundles)
        let kpiPercentage = 0;
        if (kpiSettingsData && (kpiSettingsData.global || kpiSettingsData.teamLeader)) {
          const metrics: EmployeeMetrics = {
            attendancePercentage,
            closedDealsCount: finalDealsCount,
            sheetsCount,
            meetingsCount,
            assessmentsCount,
            requestsCount,
          };
          // Decide which indicators to use: prefer team-leader settings for leaders (aggregated data)
          const indicatorsToUse = leaderStats && kpiSettingsData.teamLeader && kpiSettingsData.teamLeader.indicators && kpiSettingsData.teamLeader.indicators.length > 0
            ? kpiSettingsData.teamLeader.indicators
            : kpiSettingsData.global.indicators;

          console.log(`\n📊 === KPI Calculation for ${emp.name} ===`);
          console.log('🔹 Metrics:', metrics);
          console.log('🔹 Using Indicators:', indicatorsToUse.map((ind: any) => `${ind.name} (target: ${ind.target}, weight: ${ind.weight})`));

          const kpiScores: KPIScores = calculateEmployeeKPI(metrics, indicatorsToUse);
          kpiPercentage = Math.round(kpiScores.total * 10) / 10; // Round to 1 decimal place
          
          // Debug logging
          console.log('🔹 Calculated Scores:', kpiScores);
          console.log(`✅ Final KPI Percentage: ${kpiPercentage}%`);
          console.log('');
        } else {
          console.log(`⚠️ KPI Settings NOT available for ${emp.name}`);
          console.log('   - kpiSettingsData:', !!kpiSettingsData);
          console.log('   - global indicators:', kpiSettingsData?.global?.indicators);
        }

        return {
          _id: emp._id,
          name: emp.name,
          position: emp.position || 'N/A',
          salary: emp.salary || 0,
          leadsCount: finalLeadsCount,
          closedDealsCount: finalDealsCount,
          attendancePercentage,
          sheetsCount,
          meetingsCount,
          assessmentsCount,
          requestsCount,
          kpiPercentage,
        };
      });

      setReportData(report);
    } catch (error) {
      console.error('Error fetching report data:', error);
      addToast('Error loading report data', 'error');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleExportToExcel = () => {
    if (reportData.length === 0) {
      addToast('No data to export', 'error');
      return;
    }

    // Create CSV content
    const headers = [
      'Employee Name',
      'Position',
      'Salary',
      'Leads',
      'Deals',
      'Attendance %',
      'Sheets',
      'Meetings',
      'Assessments',
      'Requests',
      'KPI %',
    ];

    const rows = reportData.map((emp) => [
      emp.name,
      emp.position,
      emp.salary,
      emp.leadsCount,
      emp.closedDealsCount,
      `${emp.attendancePercentage}%`,
      emp.sheetsCount,
      emp.meetingsCount,
      emp.assessmentsCount,
      emp.requestsCount,
      `${emp.kpiPercentage}%`,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `employee_report_${selectedYear}-${selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast('✅ Report exported successfully!', 'success');
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-600 to-purple-500 rounded-xl">
              <TrendingUp className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-5xl font-bold text-white mb-1">Monthly Employee Report</h1>
              <p className="text-slate-400">Comprehensive employee performance and metrics overview</p>
            </div>
          </div>
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
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
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
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>

              <div className="flex items-center gap-2 bg-gradient-to-br from-purple-600 to-purple-500 px-4 py-3 rounded-lg border border-purple-400">
                <Calendar size={20} className="text-white" />
                <span className="font-semibold text-white">
                  {selectedMonthName} {selectedYear}
                </span>
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExportToExcel}
              disabled={loadingReport || reportData.length === 0}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:from-slate-600 disabled:to-slate-600 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap"
            >
              <Download size={20} />
              Export to CSV
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loadingReport ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-purple-500" size={40} />
          </div>
        ) : (
          <>
            {/* KPI Load Error Warning */}
            {kpiLoadError && (
              <div className="mb-6 bg-amber-900/20 border border-amber-700 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="text-amber-200 font-semibold">KPI Settings Warning</h3>
                  <p className="text-amber-300 text-sm mt-1">
                    {kpiLoadError}. KPI percentages will not be calculated. Please configure KPI settings in System Settings.
                  </p>
                </div>
              </div>
            )}

            {reportData.length === 0 ? (
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-12 text-center border border-slate-700">
                <p className="text-slate-400 text-lg">No employee data available</p>
              </div>
            ) : (
              <>
                {/* Report Table */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl overflow-x-auto border border-slate-700">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-white">
                      Employee
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-white border-l border-slate-700">
                      Position
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-white border-l border-slate-700">
                      Salary
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-emerald-300 border-l border-slate-700 bg-emerald-600/10">
                      Leads
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-cyan-300 border-l border-slate-700 bg-cyan-600/10">
                      Deals
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-blue-300 border-l border-slate-700 bg-blue-600/10">
                      Attendance %
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-yellow-300 border-l border-slate-700 bg-yellow-600/10">
                      Sheets
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-pink-300 border-l border-slate-700 bg-pink-600/10">
                      Meetings
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-purple-300 border-l border-slate-700 bg-purple-600/10">
                      Assessments
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-orange-300 border-l border-slate-700 bg-orange-600/10">
                      Requests
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-orange-300 border-l border-slate-700 bg-orange-600/10">
                      KPI %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((employee, index) => (
                    <tr
                      key={employee._id}
                      className={index % 2 === 0 ? 'bg-slate-800' : 'bg-slate-700/50'}
                    >
                      {/* Employee Name */}
                      <td className="px-6 py-4 text-sm font-semibold text-white border-r border-slate-700 sticky left-0 bg-inherit z-10">
                        {employee.name}
                      </td>

                      {/* Position */}
                      <td className="px-6 py-4 text-center text-sm text-slate-300 border-l border-slate-700 bg-inherit">
                        {employee.position}
                      </td>

                      {/* Salary */}
                      <td className="px-6 py-4 text-center text-sm font-semibold text-slate-200 border-l border-slate-700 bg-inherit">
                        ${employee.salary.toLocaleString()}
                      </td>

                      {/* Leads Count */}
                      <td className="px-6 py-4 text-center border-l border-slate-700 bg-emerald-600/10">
                        <span className="inline-block bg-gradient-to-br from-emerald-600 to-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-lg">
                          {employee.leadsCount}
                        </span>
                      </td>

                      {/* Deals Count */}
                      <td className="px-6 py-4 text-center border-l border-slate-700 bg-cyan-600/10">
                        <span className="inline-block bg-gradient-to-br from-cyan-600 to-cyan-500 text-white px-4 py-2 rounded-lg font-bold text-lg">
                          {employee.closedDealsCount}
                        </span>
                      </td>

                      {/* Attendance Percentage */}
                      <td className="px-6 py-4 text-center border-l border-slate-700 bg-blue-600/10">
                        <span className="inline-block bg-gradient-to-br from-blue-600 to-blue-500 text-white px-4 py-2 rounded-lg font-bold text-lg">
                          {employee.attendancePercentage}%
                        </span>
                      </td>

                      {/* Sheets Count */}
                      <td className="px-6 py-4 text-center border-l border-slate-700 bg-yellow-600/10">
                        <span className="inline-block bg-gradient-to-br from-yellow-600 to-yellow-500 text-white px-4 py-2 rounded-lg font-bold text-lg">
                          {employee.sheetsCount}
                        </span>
                      </td>

                      {/* Meetings Count */}
                      <td className="px-6 py-4 text-center border-l border-slate-700 bg-pink-600/10">
                        <span className="inline-block bg-gradient-to-br from-pink-600 to-pink-500 text-white px-4 py-2 rounded-lg font-bold text-lg">
                          {employee.meetingsCount}
                        </span>
                      </td>

                      {/* Assessments Count */}
                      <td className="px-6 py-4 text-center border-l border-slate-700 bg-purple-600/10">
                        <span className="inline-block bg-gradient-to-br from-purple-600 to-purple-500 text-white px-4 py-2 rounded-lg font-bold text-lg">
                          {employee.assessmentsCount}
                        </span>
                      </td>

                      {/* Requests Count */}
                      <td className="px-6 py-4 text-center border-l border-slate-700 bg-orange-600/10">
                        <span className="inline-block bg-gradient-to-br from-orange-600 to-orange-500 text-white px-4 py-2 rounded-lg font-bold text-lg">
                          {employee.requestsCount}
                        </span>
                      </td>

                      {/* KPI Percentage */}
                      <td className="px-6 py-4 text-center border-l border-slate-700 bg-orange-600/10">
                        {employee.kpiPercentage > 0 ? (
                          <span className={`inline-block px-4 py-2 rounded-lg font-bold text-lg ${
                            employee.kpiPercentage >= 80 
                              ? 'bg-gradient-to-br from-emerald-600 to-emerald-500 text-white'
                              : employee.kpiPercentage >= 60
                              ? 'bg-gradient-to-br from-yellow-600 to-yellow-500 text-white'
                              : 'bg-gradient-to-br from-red-600 to-red-500 text-white'
                          }`}>
                            {employee.kpiPercentage.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-400 font-semibold">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700 hover:shadow-2xl hover:border-emerald-500 transition-all group">
                <h3 className="text-slate-400 text-sm font-bold mb-3 uppercase tracking-wide">Total Employees</h3>
                <div className="flex items-center justify-between">
                  <p className="text-4xl font-bold text-white">{reportData.length}</p>
                  <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-xl p-3 group-hover:scale-110 transition-transform">
                    <Users size={24} className="text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700 hover:shadow-2xl hover:border-cyan-500 transition-all group">
                <h3 className="text-slate-400 text-sm font-bold mb-3 uppercase tracking-wide">Total Leads</h3>
                <div className="flex items-center justify-between">
                  <p className="text-4xl font-bold text-white">
                    {reportData.reduce((sum, emp) => sum + emp.leadsCount, 0)}
                  </p>
                  <div className="bg-gradient-to-br from-cyan-600 to-cyan-500 rounded-xl p-3 group-hover:scale-110 transition-transform">
                    <TrendingUp size={24} className="text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700 hover:shadow-2xl hover:border-purple-500 transition-all group">
                <h3 className="text-slate-400 text-sm font-bold mb-3 uppercase tracking-wide">Total Deals</h3>
                <div className="flex items-center justify-between">
                  <p className="text-4xl font-bold text-white">
                    {reportData.reduce((sum, emp) => sum + emp.closedDealsCount, 0)}
                  </p>
                  <div className="bg-gradient-to-br from-purple-600 to-purple-500 rounded-xl p-3 group-hover:scale-110 transition-transform">
                    <TrendingUp size={24} className="text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700 hover:shadow-2xl hover:border-blue-500 transition-all group">
                <h3 className="text-slate-400 text-sm font-bold mb-3 uppercase tracking-wide">Avg Attendance</h3>
                <div className="flex items-center justify-between">
                  <p className="text-4xl font-bold text-white">
                    {reportData.length > 0
                      ? Math.round(
                          reportData.reduce((sum, emp) => sum + emp.attendancePercentage, 0) /
                            reportData.length
                        )
                      : 0}
                    %
                  </p>
                  <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl p-3 group-hover:scale-110 transition-transform">
                    <Calendar size={24} className="text-white" />
                  </div>
                </div>
              </div>
            </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
