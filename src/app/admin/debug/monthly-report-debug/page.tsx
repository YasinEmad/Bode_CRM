'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';

interface DebugData {
  endpoint: string;
  status: string;
  count: number;
  data: any;
  error?: string;
}

export default function MonthlyReportDebug() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const [month, setMonth] = useState('03');
  const [year, setYear] = useState('2026');
  const [debugData, setDebugData] = useState<DebugData[]>([]);
  const [loadingDebug, setLoadingDebug] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/unauthorized');
    }
  }, [user, loading, router]);

  const checkEndpoint = async (endpoint: string, label: string) => {
    try {
      const url = endpoint
        .replace('{month}', `${year}-${month}`)
        .replace('{year}', year)
        .replace('{month-only}', month);

      console.log(`🔍 Checking: ${label} → ${url}`);
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      
      // Count items based on endpoint structure
      let count = 0;
      let dataPreview = data;
      
      if (data.employees) count = data.employees.length;
      else if (data.leads) count = data.leads.length;
      else if (data.snapshots) count = data.snapshots.length;
      else if (data.records) count = data.records.length;
      else if (data.performances) count = data.performances.length;
      else count = Object.keys(data).length;

      return {
        endpoint: label,
        status: response.ok ? '✅ OK' : `❌ ${response.status}`,
        count,
        data: dataPreview,
        error: response.ok ? undefined : data.error,
      };
    } catch (error) {
      return {
        endpoint: label,
        status: '❌ Error',
        count: 0,
        data: {},
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  const runDebugTests = async () => {
    setLoadingDebug(true);
    const results: DebugData[] = [];

    const endpoints = [
      ['/api/employees', 'Employees'],
      ['/api/leads', 'Leads'],
      [`/api/closed-deals?month={month}`, 'Closed Deals'],
      [`/api/admin/attendance-records?month={month}`, 'Attendance Records'],
      [`/api/admin/team-performance?month={month}`, 'Team Performance'],
      [`/api/admin/team-leaders-performance?month={month}`, 'Team Leaders Performance'],
      ['/api/kpi-settings', 'KPI Settings (Global)'],
      ['/api/kpi-settings?role=team-leader', 'KPI Settings (Team Leader)'],
    ];

    for (const [endpoint, label] of endpoints) {
      const result = await checkEndpoint(endpoint as string, label as string);
      results.push(result);
      console.log(result);
    }

    setDebugData(results);
    setLoadingDebug(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Monthly Report Debug</h1>

        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 mb-8 border border-slate-700">
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Month</label>
              <input
                type="text"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                placeholder="03"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Year</label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2026"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={runDebugTests}
                disabled={loadingDebug}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-6 py-2 rounded-lg font-semibold transition"
              >
                {loadingDebug ? 'Testing...' : 'Run Tests'}
              </button>
            </div>
          </div>
        </div>

        {debugData.length > 0 && (
          <div className="space-y-4">
            {debugData.map((result, idx) => (
              <div
                key={idx}
                className={`bg-gradient-to-br ${
                  result.status.startsWith('✅')
                    ? 'from-emerald-900/30 to-emerald-800/20 border-emerald-700'
                    : 'from-red-900/30 to-red-800/20 border-red-700'
                } rounded-lg shadow p-6 border`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{result.endpoint}</h3>
                    <p className="text-slate-400 text-sm">{result.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">{result.count}</p>
                    <p className="text-slate-400 text-sm">Items</p>
                  </div>
                </div>

                {result.error && (
                  <div className="bg-red-950/50 border border-red-700 rounded p-3 mb-4">
                    <p className="text-red-200 text-sm font-mono">{result.error}</p>
                  </div>
                )}

                <details className="cursor-pointer">
                  <summary className="text-slate-300 hover:text-white font-semibold">
                    View JSON Response
                  </summary>
                  <pre className="bg-slate-950/50 rounded p-4 mt-3 text-slate-300 text-xs overflow-x-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
