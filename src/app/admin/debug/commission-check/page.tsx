'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { AlertCircle, CheckCircle, XCircle, Loader } from 'lucide-react';

interface DebugData {
  debug: {
    timestamp: string;
    totalEmployees: number;
    employeesWithPosition: number;
    employeesWithoutPosition: number;
    missingPositions: Array<{ name: string; email: string }>;
  };
  rules: {
    totalRules: number;
    rulesWithPercentage: number;
    rules: Array<{
      position: string;
      percentage: number;
      normalized: string;
    }>;
  };
  commissions: {
    totalCommissions: number;
    byPercentage: Array<{ _id: number; count: number; totalAmount: number }>;
  };
  matches: Array<{
    employeeName: string;
    position: string;
    normalizedPosition: string;
    hasRule: boolean;
    rulePercentage: number | null;
    appliedPercentage: number;
  }>;
  recommendations: string[];
}

export default function CommissionDebug() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DebugData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (token) {
      fetchDebugData();
    }
  }, [token]);

  const fetchDebugData = async () => {
    try {
      const res = await fetch('/api/debug/commission-check', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch debug data');
    } finally {
      setLoadingData(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navbar />
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Commission Rules Debug</h1>
          <p className="text-slate-400">Check why commission rules are not being applied</p>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-20">
            <Loader size={40} className="animate-spin text-blue-400" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-red-400">
            <p>{error}</p>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Recommendations */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <AlertCircle size={24} className="text-amber-400" />
                Status & Recommendations
              </h2>
              <div className="space-y-2">
                {data.recommendations.map((rec, idx) => (
                  <div key={idx} className="text-slate-300 text-sm">
                    {rec.includes('✅') ? (
                      <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle size={16} />
                        {rec}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-400">
                        <AlertCircle size={16} />
                        {rec}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Overall Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-700">
                <p className="text-slate-400 text-sm font-medium">Total Employees</p>
                <p className="text-3xl font-bold text-white mt-2">{data.debug.totalEmployees}</p>
                <p className="text-xs text-slate-500 mt-2">Sales staff</p>
              </div>
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-700">
                <p className="text-slate-400 text-sm font-medium">With Position</p>
                <p className="text-3xl font-bold text-emerald-400 mt-2">{data.debug.employeesWithPosition}</p>
                <p className="text-xs text-slate-500 mt-2">Can use rules</p>
              </div>
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-700">
                <p className="text-slate-400 text-sm font-medium">Commission Rules</p>
                <p className="text-3xl font-bold text-blue-400 mt-2">{data.rules.totalRules}</p>
                <p className="text-xs text-slate-500 mt-2">{data.rules.rulesWithPercentage} active</p>
              </div>
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-lg p-6 border border-slate-700">
                <p className="text-slate-400 text-sm font-medium">Total Commissions</p>
                <p className="text-3xl font-bold text-amber-400 mt-2">{data.commissions.totalCommissions}</p>
                <p className="text-xs text-slate-500 mt-2">Created</p>
              </div>
            </div>

            {/* Commission Rules */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">Commission Rules</h2>
              {data.rules.rules.length === 0 ? (
                <div className="text-slate-400 text-sm p-4 bg-slate-700/50 rounded">
                  No commission rules configured
                </div>
              ) : (
                <div className="space-y-3">
                  {data.rules.rules.map((rule, idx) => (
                    <div key={idx} className="bg-slate-700/50 p-4 rounded border border-slate-600">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-semibold">{rule.position}</p>
                          <p className="text-xs text-slate-400 mt-1">Normalized: {rule.normalized}</p>
                        </div>
                        <div className="text-right">
                          {rule.percentage > 0 ? (
                            <p className="text-2xl font-bold text-emerald-400">{rule.percentage}%</p>
                          ) : (
                            <p className="text-2xl font-bold text-red-400">0%</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Employee-Rule Matches */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">Employee & Rule Matching</h2>
              {data.matches.length === 0 ? (
                <div className="text-slate-400 text-sm p-4 bg-slate-700/50 rounded">
                  No employees with positions
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {data.matches.map((match, idx) => (
                    <div key={idx} className="bg-slate-700/50 p-4 rounded border border-slate-600">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-white font-semibold">{match.employeeName}</p>
                          <p className="text-sm text-slate-400 mt-1">Position: {match.position}</p>
                          <p className="text-xs text-slate-500 mt-1">Normalized: {match.normalizedPosition}</p>
                        </div>
                        <div className="text-right">
                          {match.hasRule ? (
                            <div>
                              <CheckCircle className="text-emerald-400 mb-2 inline" size={20} />
                              <p className="text-emerald-400 font-semibold">{match.appliedPercentage}%</p>
                              <p className="text-xs text-slate-400">Applied</p>
                            </div>
                          ) : (
                            <div>
                              <XCircle className="text-red-400 mb-2 inline" size={20} />
                              <p className="text-red-400 font-semibold">No Match</p>
                              <p className="text-xs text-slate-400">Falls to default 5%</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Missing Positions */}
            {data.debug.employeesWithoutPosition > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
                  <XCircle size={24} />
                  Employees Missing Position
                </h2>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {data.debug.missingPositions.map((emp, idx) => (
                    <div key={idx} className="text-sm text-red-300">
                      <p className="font-semibold">{emp.name}</p>
                      <p className="text-xs text-red-200">{emp.email}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-red-300 mt-4">⚠️ These employees cannot use commission rules. Please add positions in the Employees section.</p>
              </div>
            )}

            {/* Commission Distribution */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700">
              <h2 className="text-xl font-bold text-white mb-4">Commission Distribution by Rate</h2>
              {data.commissions.byPercentage.length === 0 ? (
                <div className="text-slate-400 text-sm p-4 bg-slate-700/50 rounded">
                  No commissions created yet
                </div>
              ) : (
                <div className="space-y-3">
                  {data.commissions.byPercentage.map((item, idx) => (
                    <div key={idx} className="bg-slate-700/50 p-4 rounded border border-slate-600">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white font-semibold">{item._id}% Rate</p>
                          <p className="text-sm text-slate-400 mt-1">{item.count} commissions</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-emerald-400">${item.totalAmount.toLocaleString()}</p>
                          <p className="text-xs text-slate-400">Total Amount</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
