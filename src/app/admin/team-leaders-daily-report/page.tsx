'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, AlertCircle, TrendingUp, Users } from 'lucide-react';

interface TeamLeaderDailyData {
  userId: string;
  leaderName: string;
  month: string;
  daysInMonth: number;
  sheets: Record<string, number>;
  assessments: Record<string, number>;
  meetings: Record<string, number>;
  requests: Record<string, number>;
  leaderPersonal?: Record<string, any>;
  aggregated?: Record<string, any>;
  leaderOwnLeads: number;
  leaderOwnDeals: number;
  teamLeadsCount: number;
  teamDealsCount: number;
}

export default function TeamLeadersDailyReport() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [reportData, setReportData] = useState<TeamLeaderDailyData[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [currentDate, setCurrentDate] = useState<string>('');

  // Check authentication
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/unauthorized');
    }
  }, [user, loading, router]);

  // Set current month and fetch data
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const monthStr = `${year}-${month}`;
    const dateStr = `${day}/${month}/${year}`;

    setCurrentDate(dateStr);

    if (token) {
      fetchDailyData(monthStr);
    }
  }, [token]);

  const fetchDailyData = async (month: string) => {
    try {
      setLoadingReport(true);

      const response = await fetch(`/api/admin/team-leaders-performance?month=${month}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch team leaders daily data');
      }

      const data = await response.json();
      setReportData(data.performances || []);
    } catch (error) {
      console.error('Error fetching daily report:', error);
      addToast('Error loading team leaders daily data', 'error');
      setReportData([]);
    } finally {
      setLoadingReport(false);
    }
  };

  const calculateDayTotal = (dayData: Record<string, number>, day: string): number => {
    return dayData[day] || 0;
  };

  const getTodayKey = (): string => {
    const today = new Date();
    return `day${today.getDate()}`;
  };

  const todayKey = getTodayKey();
  const today = new Date().getDate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <Loader className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="text-blue-600" size={32} />
            <div>
              <h1 className="text-3xl font-bold text-white">Team Leaders Daily Report</h1>
              <p className="text-slate-400 text-sm mt-1">Real-time KPI tracking for team leaders • {currentDate}</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm">
            Aggregation modes respect your configured settings in KPI Settings • Team Leader Only vs Team Leader + Team
          </p>
        </div>

        {/* Loading State */}
        {loadingReport && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
            <p className="text-slate-400">Loading team leaders data...</p>
          </div>
        )}

        {/* No Data State */}
        {!loadingReport && reportData.length === 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 text-center">
            <AlertCircle className="mx-auto text-amber-500 mb-4" size={32} />
            <h3 className="text-slate-300 font-semibold mb-2">No team leaders found</h3>
            <p className="text-slate-400 text-sm">There are no team leaders with data for this period</p>
          </div>
        )}

        {/* Report Data */}
        {!loadingReport && reportData.length > 0 && (
          <div className="space-y-6">
            {reportData.map((leader) => (
              <div
                key={leader.userId}
                className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl border border-slate-700 p-6"
              >
                {/* Leader Header */}
                <div className="mb-6 pb-6 border-b border-slate-600">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{leader.leaderName}</h3>
                      <p className="text-slate-400 text-sm">Team Leader Performance</p>
                    </div>
                    <div className="text-right">
                      <div className="inline-block bg-blue-600/20 text-blue-400 px-3 py-1 rounded-lg text-sm font-medium">
                        Today's Data
                      </div>
                    </div>
                  </div>
                </div>

                {/* Today's Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {/* Sheets */}
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                    <p className="text-slate-400 text-sm mb-2">Sheets Today</p>
                    <p className="text-2xl font-bold text-blue-400">
                      {calculateDayTotal(leader.sheets, todayKey)}
                    </p>
                  </div>

                  {/* Meetings */}
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                    <p className="text-slate-400 text-sm mb-2">Meetings Today</p>
                    <p className="text-2xl font-bold text-purple-400">
                      {calculateDayTotal(leader.meetings, todayKey)}
                    </p>
                  </div>

                  {/* Assessments */}
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                    <p className="text-slate-400 text-sm mb-2">Assessments Today</p>
                    <p className="text-2xl font-bold text-emerald-400">
                      {calculateDayTotal(leader.assessments, todayKey)}
                    </p>
                  </div>

                  {/* Requests */}
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                    <p className="text-slate-400 text-sm mb-2">Requests Today</p>
                    <p className="text-2xl font-bold text-orange-400">
                      {calculateDayTotal(leader.requests, todayKey)}
                    </p>
                  </div>
                </div>

                {/* Leads & Deals Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="text-blue-400" size={16} />
                      <p className="text-slate-400 text-sm">Leads (Month)</p>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-slate-500 text-xs mb-1">Team Total</p>
                        <p className="text-2xl font-bold text-blue-400">{leader.teamLeadsCount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500 text-xs mb-1">Leader Own</p>
                        <p className="text-lg font-semibold text-slate-300">{leader.leaderOwnLeads}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-600">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="text-emerald-400" size={16} />
                      <p className="text-slate-400 text-sm">Deals Closed (Month)</p>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-slate-500 text-xs mb-1">Team Total</p>
                        <p className="text-2xl font-bold text-emerald-400">{leader.teamDealsCount}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500 text-xs mb-1">Leader Own</p>
                        <p className="text-lg font-semibold text-slate-300">{leader.leaderOwnDeals}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Aggregation Mode Info */}
                <div className="mt-6 pt-6 border-t border-slate-600">
                  <p className="text-slate-400 text-xs">
                    ℹ️ Metrics above reflect the aggregation mode configured in KPI Settings. Check if this leader uses
                    'Team Leader Only' or 'Team Leader + Team' calculation.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
