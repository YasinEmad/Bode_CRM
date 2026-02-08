'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, Calendar, TrendingUp, AlertCircle, Download, Target } from 'lucide-react';
import { calculateEmployeeKPI, EmployeeMetrics, KPIScores } from '@/lib/kpiCalculator';
import { countWorkdaysInMonth } from '@/lib/workdays';

interface MyKPIData {
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
  kpiBreakdown?: {
    attendance: number;
    deals: number;
    sheets: number;
    meetings: number;
    assessments: number;
    requests: number;
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

export default function MyMonthlyKPIs() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [kpiData, setKpiData] = useState<MyKPIData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
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
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch KPI data when month/year changes or user changes
  useEffect(() => {
    if (selectedMonth && selectedYear && token && user) {
      const loadData = async () => {
        const kpiSettingsData = await fetchKpiSettingsAndReturn();
        if (kpiSettingsData) {
          await fetchMyKPIData(kpiSettingsData);
        }
      };
      loadData();
    }
  }, [selectedMonth, selectedYear, token, user]);

  const fetchKpiSettingsAndReturn = async (): Promise<any> => {
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
        throw new Error(errorData.error || 'Failed to load KPI settings');
      }

      const data = await res.json();
      console.log('✅ KPI settings received:', data.kpiSettings);

      // Validate KPI settings structure
      if (!data.kpiSettings || !Array.isArray(data.kpiSettings.indicators) || data.kpiSettings.indicators.length === 0) {
        console.error('❌ Invalid KPI settings structure');
        throw new Error('Invalid KPI settings format');
      }

      // Validate all required indicators are present
      // requests is optional for backward compatibility
      const requiredIndicators = ['attendance', 'deals', 'sheets', 'meetings', 'assessments'];
      const providedIndicators = data.kpiSettings.indicators.map((ind: any) => ind.name);
      const missingIndicators = requiredIndicators.filter(ind => !providedIndicators.includes(ind));

      if (missingIndicators.length > 0) {
        console.error('❌ Missing indicators:', missingIndicators);
        throw new Error(`Missing indicators: ${missingIndicators.join(', ')}`);
      }

      // Validate total weight
      const totalWeight = data.kpiSettings.indicators.reduce((sum: number, ind: any) => sum + ind.weight, 0);
      if (Math.abs(totalWeight - 100) > 0.01) {
        console.error('❌ Invalid total weight:', totalWeight);
        throw new Error(`Total weight must be 100%, got ${totalWeight.toFixed(2)}%`);
      }

      console.log('✅ KPI settings validated successfully');
      setKpiSettings(data.kpiSettings);
      setKpiLoadError(null);

      return data.kpiSettings;
    } catch (error) {
      console.error('❌ Error fetching KPI settings:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to load KPI settings';
      setKpiLoadError(errorMsg);
      setKpiSettings(null);
      return null;
    }
  };

  const fetchMyKPIData = async (kpiSettingsData: any) => {
    try {
      setLoadingData(true);

      if (!user?.id) {
        throw new Error('User ID not available');
      }

      // Fetch current user details using auth endpoint
      const userResponse = await fetch(`/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user details');
      }

      const userData = await userResponse.json();

      // Fetch leads for this employee for the selected month
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
        `/api/attendance?month=${selectedYear}-${selectedMonth}`,
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

      // Fetch user's own performance data (for calls, meetings, assessments)
      const performanceResponse = await fetch(
        `/api/performance/my-performance?month=${selectedYear}-${selectedMonth}`,
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

      // Calculate leads and deals for the selected month
      const selectedMonthStart = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1);
      const selectedMonthEnd = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0);
      selectedMonthEnd.setHours(23, 59, 59, 999);

      let leadsCount = 0;
      let dealsCount = 0;

      leadsData.leads?.forEach((lead: any) => {
        const leadDate = new Date(lead.createdAt);
        const employeeId = lead.assignedTo?._id || lead.assignedTo;

        if (employeeId === user.id && leadDate >= selectedMonthStart && leadDate <= selectedMonthEnd) {
          leadsCount++;
          if (lead.status === 'closed' || lead.status === 'won') {
            dealsCount++;
          }
        }
      });

      // Get attendance percentage
      let attendancePercentage = 0;
      const employeeAttendance = attendanceData.attendances || [];

      if (employeeAttendance.length > 0) {
        // Get the actual number of working days in the month (exclude Friday by default)
        const daysInMonth = countWorkdaysInMonth(parseInt(selectedYear), parseInt(selectedMonth) - 1);
        
        // Count check-in records (each = 1 day present)
        const presentDays = employeeAttendance.length;
        
        // Calculate attendance percentage based on total days in month
        attendancePercentage = Math.round((presentDays / daysInMonth) * 100);
      }

      // Get sheets, meetings, assessments, and requests
      const sheetsCount = performanceData.performance?.sheetsCount || 0;
      const meetingsCount = performanceData.performance?.meetingsCount || 0;
      const assessmentsCount = performanceData.performance?.assessmentsCount || 0;
      const requestsCount = performanceData.performance?.requestsCount || 0;

      // Calculate KPI
      let kpiPercentage = 0;
      let kpiBreakdown = {
        attendance: 0,
        deals: 0,
        sheets: 0,
        meetings: 0,
        assessments: 0,
        requests: 0,
      };

      if (kpiSettingsData) {
        const metrics: EmployeeMetrics = {
          attendancePercentage,
          closedDealsCount: dealsCount,
          sheetsCount,
          meetingsCount,
          assessmentsCount,
          requestsCount,
        };

        console.log(`📊 Calculating KPI for ${userData.user.name}:`, metrics);

        const result = calculateEmployeeKPI(metrics, kpiSettingsData.indicators);
        kpiPercentage = result.total;

        // Use KPI scores from calculation result
        if (result) {
          kpiBreakdown.attendance = result.attendance;
          kpiBreakdown.deals = result.deals;
          kpiBreakdown.sheets = result.sheets;
          kpiBreakdown.meetings = result.meetings;
          kpiBreakdown.assessments = result.assessments;
          kpiBreakdown.requests = result.requests;
        }

        console.log(`✅ Final KPI Percentage: ${kpiPercentage}%`);
      } else {
        console.log(`⚠️ KPI Settings NOT available`);
      }

      setKpiData({
        _id: userData.user._id,
        name: userData.user.name,
        position: userData.user.position || 'N/A',
        salary: userData.user.salary || 0,
        leadsCount,
        closedDealsCount: dealsCount,
        attendancePercentage,
        sheetsCount,
        meetingsCount,
        assessmentsCount,
        requestsCount,
        kpiPercentage,
        kpiBreakdown,
      });
    } catch (error) {
      console.error('Error fetching KPI data:', error);
      addToast('Error loading KPI data', 'error');
      setKpiData(null);
    } finally {
      setLoadingData(false);
    }
  };

  const handleExportToExcel = () => {
    if (!kpiData) {
      addToast('No data to export', 'error');
      return;
    }

    // Create CSV content
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Employee Name', kpiData.name],
      ['Position', kpiData.position],
      ['Salary', `$${kpiData.salary.toLocaleString()}`],
      ['Leads', kpiData.leadsCount],
      ['Closed Deals', kpiData.closedDealsCount],
      ['Attendance %', `${kpiData.attendancePercentage}%`],
      ['Sheets', kpiData.sheetsCount],
      ['Meetings', kpiData.meetingsCount],
      ['Assessments', kpiData.assessmentsCount],
      ['Requests', kpiData.requestsCount],
      ['KPI Score', `${kpiData.kpiPercentage.toFixed(1)}%`],
    ];

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `my_kpi_report_${selectedYear}-${selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast('✅ KPI report exported successfully!', 'success');
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-xl">
              <Target className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-5xl font-bold text-white mb-1">My Monthly KPIs</h1>
              <p className="text-slate-400">Your personal performance metrics and KPI score</p>
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
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Year
                </label>
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

            {/* Export Button */}
            <button
              onClick={handleExportToExcel}
              disabled={loadingData || !kpiData}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:from-slate-600 disabled:to-slate-600 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap"
            >
              <Download size={20} />
              Export
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-indigo-500" size={40} />
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
                    {kpiLoadError}. KPI score will not be calculated. Please contact your administrator.
                  </p>
                </div>
              </div>
            )}

            {!kpiData ? (
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-12 text-center border border-slate-700">
                <p className="text-slate-400 text-lg">No KPI data available for this period</p>
              </div>
            ) : (
              <>
                {/* KPI Score Card - Large with Breakdown */}
                <div className="mb-8 bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-8 border border-slate-700">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main KPI Score */}
                    <div className="lg:col-span-1 flex flex-col items-center justify-center">
                      <h2 className="text-slate-400 text-sm font-bold mb-6 uppercase tracking-wide">Overall KPI Score</h2>
                      <div className={`relative w-40 h-40 rounded-full flex items-center justify-center ${
                        kpiData.kpiPercentage >= 80
                          ? 'bg-gradient-to-br from-emerald-600 to-emerald-500 shadow-lg shadow-emerald-500/50'
                          : kpiData.kpiPercentage >= 60
                          ? 'bg-gradient-to-br from-yellow-600 to-yellow-500 shadow-lg shadow-yellow-500/50'
                          : 'bg-gradient-to-br from-red-600 to-red-500 shadow-lg shadow-red-500/50'
                      }`}>
                        <div className="text-center">
                          <p className="text-5xl font-bold text-white">
                            {kpiData.kpiPercentage.toFixed(0)}
                          </p>
                          <p className="text-white text-sm font-semibold">%</p>
                        </div>
                      </div>
                      <p className="text-slate-300 text-center mt-6 font-semibold">
                        {kpiData.kpiPercentage >= 80
                          ? '🎉 Excellent Performance!'
                          : kpiData.kpiPercentage >= 60
                          ? '👍 Good Performance!'
                          : '📈 Keep Improving!'}
                      </p>
                    </div>

                    {/* KPI Breakdown */}
                    <div className="lg:col-span-2">
                      <h3 className="text-slate-300 font-bold mb-6 text-base">📊 Performance Breakdown</h3>
                      <div className="space-y-3">
                        {/* Attendance */}
                        <div className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg hover:bg-slate-700 transition">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-blue-400 text-lg">📅</span>
                            <span className="text-slate-300 text-sm">Attendance</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-24 bg-slate-600 rounded-full h-2">
                              <div className="bg-blue-500 h-2 rounded-full transition-all" style={{width: `${Math.min(kpiData?.kpiBreakdown?.attendance || 0, 100)}%`}}></div>
                            </div>
                            <span className="text-white font-bold text-sm w-12 text-right">{(kpiData?.kpiBreakdown?.attendance || 0).toFixed(1)}%</span>
                          </div>
                        </div>

                        {/* Deals */}
                        <div className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg hover:bg-slate-700 transition">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-cyan-400 text-lg">🎯</span>
                            <span className="text-slate-300 text-sm">Closed Deals</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-24 bg-slate-600 rounded-full h-2">
                              <div className="bg-cyan-500 h-2 rounded-full transition-all" style={{width: `${Math.min(kpiData?.kpiBreakdown?.deals || 0, 100)}%`}}></div>
                            </div>
                            <span className="text-white font-bold text-sm w-12 text-right">{(kpiData?.kpiBreakdown?.deals || 0).toFixed(1)}%</span>
                          </div>
                        </div>

                        {/* Sheets */}
                        <div className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg hover:bg-slate-700 transition">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-yellow-400 text-lg">📄</span>
                            <span className="text-slate-300 text-sm">Sheets</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-24 bg-slate-600 rounded-full h-2">
                              <div className="bg-yellow-500 h-2 rounded-full transition-all" style={{width: `${Math.min(kpiData?.kpiBreakdown?.sheets || 0, 100)}%`}}></div>
                            </div>
                            <span className="text-white font-bold text-sm w-12 text-right">{(kpiData?.kpiBreakdown?.sheets || 0).toFixed(1)}%</span>
                          </div>
                        </div>

                        {/* Meetings */}
                        <div className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg hover:bg-slate-700 transition">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-pink-400 text-lg">📋</span>
                            <span className="text-slate-300 text-sm">Meetings</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-24 bg-slate-600 rounded-full h-2">
                              <div className="bg-pink-500 h-2 rounded-full transition-all" style={{width: `${Math.min(kpiData?.kpiBreakdown?.meetings || 0, 100)}%`}}></div>
                            </div>
                            <span className="text-white font-bold text-sm w-12 text-right">{(kpiData?.kpiBreakdown?.meetings || 0).toFixed(1)}%</span>
                          </div>
                        </div>

                        {/* Assessments */}
                        <div className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg hover:bg-slate-700 transition">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-purple-400 text-lg">🎓</span>
                            <span className="text-slate-300 text-sm">Assessments</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-24 bg-slate-600 rounded-full h-2">
                              <div className="bg-purple-500 h-2 rounded-full transition-all" style={{width: `${Math.min(kpiData?.kpiBreakdown?.assessments || 0, 100)}%`}}></div>
                            </div>
                            <span className="text-white font-bold text-sm w-12 text-right">{(kpiData?.kpiBreakdown?.assessments || 0).toFixed(1)}%</span>
                          </div>
                        </div>

                        {/* Requests */}
                        <div className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg hover:bg-slate-700 transition">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-orange-400 text-lg">📞</span>
                            <span className="text-slate-300 text-sm">Requests Handled</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="w-24 bg-slate-600 rounded-full h-2">
                              <div className="bg-orange-500 h-2 rounded-full transition-all" style={{width: `${Math.min(kpiData?.kpiBreakdown?.requests || 0, 100)}%`}}></div>
                            </div>
                            <span className="text-white font-bold text-sm w-12 text-right">{(kpiData?.kpiBreakdown?.requests || 0).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Metrics Grid - Enhanced with Color Coding */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {/* Attendance */}
                  <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-5 border-l-4 border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">📅</span>
                        <h3 className="text-slate-400 font-semibold text-xs uppercase tracking-wide">Attendance</h3>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{kpiData.attendancePercentage}%</p>
                    <p className="text-slate-500 text-xs">Attendance Rate</p>
                  </div>

                  {/* Leads */}
                  <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-5 border-l-4 border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🚀</span>
                        <h3 className="text-slate-400 font-semibold text-xs uppercase tracking-wide">Leads</h3>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{kpiData.leadsCount}</p>
                    <p className="text-slate-500 text-xs">New Leads Created</p>
                  </div>

                  {/* Deals */}
                  <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-5 border-l-4 border-cyan-500 hover:shadow-xl hover:shadow-cyan-500/10 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🎯</span>
                        <h3 className="text-slate-400 font-semibold text-xs uppercase tracking-wide">Deals</h3>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{kpiData.closedDealsCount}</p>
                    <p className="text-slate-500 text-xs">out of {kpiData.leadsCount} leads</p>
                  </div>

                  {/* Conversion Rate */}
                  <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-5 border-l-4 border-yellow-500 hover:shadow-xl hover:shadow-yellow-500/10 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">📊</span>
                        <h3 className="text-slate-400 font-semibold text-xs uppercase tracking-wide">Conversion</h3>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">
                      {kpiData.leadsCount > 0 ? ((kpiData.closedDealsCount / kpiData.leadsCount) * 100).toFixed(0) : 0}%
                    </p>
                    <p className="text-slate-500 text-xs">Conversion Rate</p>
                  </div>
                </div>

                {/* Activity Metrics - Second Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {/* Sheets */}
                  <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-5 border-l-4 border-yellow-500 hover:shadow-xl hover:shadow-yellow-500/10 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">📄</span>
                        <h3 className="text-slate-400 font-semibold text-xs uppercase tracking-wide">Sheets</h3>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{kpiData.sheetsCount}</p>
                    <p className="text-slate-500 text-xs">Sheets Completed</p>
                  </div>

                  {/* Meetings */}
                  <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-5 border-l-4 border-pink-500 hover:shadow-xl hover:shadow-pink-500/10 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">📋</span>
                        <h3 className="text-slate-400 font-semibold text-xs uppercase tracking-wide">Meetings</h3>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{kpiData.meetingsCount}</p>
                    <p className="text-slate-500 text-xs">Scheduled</p>
                  </div>

                  {/* Assessments */}
                  <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-5 border-l-4 border-purple-500 hover:shadow-xl hover:shadow-purple-500/10 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🎓</span>
                        <h3 className="text-slate-400 font-semibold text-xs uppercase tracking-wide">Assessments</h3>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{kpiData.assessmentsCount}</p>
                    <p className="text-slate-500 text-xs">Completed</p>
                  </div>

                  {/* Requests */}
                  <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-lg p-5 border-l-4 border-orange-500 hover:shadow-xl hover:shadow-orange-500/10 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">📞</span>
                        <h3 className="text-slate-400 font-semibold text-xs uppercase tracking-wide">Requests</h3>
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white mb-1">{kpiData.requestsCount}</p>
                    <p className="text-slate-500 text-xs">Handled</p>
                  </div>
                </div>

                {/* Summary Info - Enhanced */}
                <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 rounded-2xl shadow-xl p-8 border border-indigo-700/50">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-3xl">👤</span>
                    <h2 className="text-white font-bold text-xl">Employee Profile</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Name */}
                    <div className="bg-slate-700/40 backdrop-blur-sm rounded-xl p-4 border border-slate-600/50">
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Name</p>
                      <p className="text-white font-bold text-lg">{kpiData.name}</p>
                    </div>

                    {/* Position */}
                    <div className="bg-slate-700/40 backdrop-blur-sm rounded-xl p-4 border border-slate-600/50">
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Position</p>
                      <p className="text-white font-bold text-lg">{kpiData.position}</p>
                    </div>

                    {/* Salary */}
                    <div className="bg-slate-700/40 backdrop-blur-sm rounded-xl p-4 border border-slate-600/50">
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Monthly Salary</p>
                      <p className="text-emerald-400 font-bold text-lg">${kpiData.salary.toLocaleString()}</p>
                    </div>

                    {/* Period */}
                    <div className="bg-slate-700/40 backdrop-blur-sm rounded-xl p-4 border border-slate-600/50">
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-2">Report Period</p>
                      <p className="text-white font-bold text-lg">{selectedMonthName} {selectedYear}</p>
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
