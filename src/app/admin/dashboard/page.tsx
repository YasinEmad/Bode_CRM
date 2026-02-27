'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Users, TrendingUp, DollarSign, CheckCircle, BarChart3, Zap, Shield } from 'lucide-react';

export default function AdminDashboard() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalLeads: 0,
    closedDeals: 0,
    totalCommissions: 0,
    activeEmployees: 0,
  });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token]);

  const fetchStats = async () => {
    try {
      const leadsRes = await fetch('/api/leads', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const leadData = await leadsRes.json();
      const leads = Array.isArray(leadData.leads) ? leadData.leads : [];

      const employeesRes = await fetch('/api/employees', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const employeeData = await employeesRes.json();
      const employees = Array.isArray(employeeData.employees) ? employeeData.employees : [];

      const commissionsRes = await fetch('/api/commissions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const commissionData = await commissionsRes.json();
      const commissions = Array.isArray(commissionData.commissions) ? commissionData.commissions : [];

      // Use ClosedDealSnapshot API to count closed deals (preserves history)
      // start with simple lead count as a fallback
      let closedDeals = leads.filter((l: any) => l.status === 'closed').length;
      try {
        const snapsRes = await fetch('/api/closed-deals', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (snapsRes.ok) {
          const snapsData = await snapsRes.json();
          const snaps = Array.isArray(snapsData.snapshots) ? snapsData.snapshots : [];

          // only count snapshots whose lead (if provided) is fully closed; this mirrors
          // the logic used in monthly reports and employee views where pending-approval
          // deals shouldn't contribute until they become truly closed.
          const leadStatusById = new Map<string, string>();
          leads.forEach((l: any) => {
            if (l._id) leadStatusById.set(String(l._id), l.status);
          });

          closedDeals = snaps.filter((snap: any) => {
            if (snap.leadId) {
              const status = leadStatusById.get(String(snap.leadId));
              if (status && status !== 'closed') {
                return false;
              }
            }
            return true;
          }).length;
        } else {
          console.warn('Failed to fetch closed-deals for dashboard', snapsRes.status);
        }
      } catch (e) {
        console.error('Error fetching closed-deals snapshots for dashboard', e);
      }
      const totalCommissions = commissions.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

      setStats({
        totalLeads: leads.length,
        closedDeals,
        totalCommissions,
        activeEmployees: employees.length,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  const conversionRate = stats.totalLeads > 0 ? ((stats.closedDeals / stats.totalLeads) * 100).toFixed(1) : 0;
  const avgCommission = stats.closedDeals > 0 ? (stats.totalCommissions / stats.closedDeals).toLocaleString('en-US', {maximumFractionDigits: 0}) : 0;

  // format total commissions with thousands separators and two decimal places
  const formattedTotalCommission = stats.totalCommissions.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl">
              <BarChart3 className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-5xl font-bold text-white mb-1">Admin Dashboard</h1>
              <p className="text-slate-400">Manage leads, employees, commissions and system settings</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700 hover:shadow-2xl hover:border-blue-500 transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Total Leads</p>
                <p className="text-4xl font-bold text-white mt-2">{stats.totalLeads}</p>
                <p className="text-xs text-slate-500 mt-2">Active leads in pipeline</p>
              </div>
              <div className="bg-gradient-to-br from-blue-600 to-blue-500 rounded-xl p-3 group-hover:scale-110 transition-transform">
                <TrendingUp size={32} className="text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700 hover:shadow-2xl hover:border-emerald-500 transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Closed Deals</p>
                <p className="text-4xl font-bold text-white mt-2">{stats.closedDeals}</p>
                <p className="text-xs text-slate-500 mt-2">Successfully closed</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-xl p-3 group-hover:scale-110 transition-transform">
                <CheckCircle size={32} className="text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700 hover:shadow-2xl hover:border-purple-500 transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Total Commission</p>
                <p className="text-5xl lg:text-4xl xl:text-3xl font-bold text-white mt-2">EGP {formattedTotalCommission}</p>
                <p className="text-[0.65rem] text-slate-500 mt-2">Cumulative earnings</p>
              </div>
              <div className="bg-gradient-to-br from-purple-600 to-purple-500 rounded-xl p-3 group-hover:scale-110 transition-transform">
                <DollarSign size={32} className="text-white" />
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700 hover:shadow-2xl hover:border-orange-500 transition-all group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Active Employees</p>
                <p className="text-4xl font-bold text-white mt-2">{stats.activeEmployees}</p>
                <p className="text-xs text-slate-500 mt-2">Team members</p>
              </div>
              <div className="bg-gradient-to-br from-orange-600 to-orange-500 rounded-xl p-3 group-hover:scale-110 transition-transform">
                <Users size={32} className="text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Bode Home */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">Bode home</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a
            href="/admin/dashboard"
            className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700 hover:shadow-2xl hover:border-slate-500 transition-all group cursor-pointer"
          >
            <div className="mb-4">
              <div className="inline-block bg-gradient-to-br from-slate-600 to-slate-500 rounded-lg p-3 group-hover:scale-110 transition-transform">
                <BarChart3 size={28} className="text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-slate-400 transition-colors">Dashboard</h3>
            <p className="text-slate-400">View overall system statistics and metrics</p>
          </a>

          <a
            href="/admin/leads"
            className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700 hover:shadow-2xl hover:border-blue-500 transition-all group cursor-pointer"
          >
            <div className="mb-4">
              <div className="inline-block bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg p-3 group-hover:scale-110 transition-transform">
                <BarChart3 size={28} className="text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">Manage Leads</h3>
            <p className="text-slate-400">Create, assign, and track leads across your pipeline</p>
          </a>

          <a
            href="/admin/employees"
            className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700 hover:shadow-2xl hover:border-purple-500 transition-all group cursor-pointer"
          >
            <div className="mb-4">
              <div className="inline-block bg-gradient-to-br from-purple-600 to-purple-500 rounded-lg p-3 group-hover:scale-110 transition-transform">
                <Users size={28} className="text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">Manage Employees</h3>
            <p className="text-slate-400">View and manage your sales team</p>
          </a>

          <a
            href="/admin/teams"
            className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700 hover:shadow-2xl hover:border-cyan-500 transition-all group cursor-pointer"
          >
            <div className="mb-4">
              <div className="inline-block bg-gradient-to-br from-cyan-600 to-cyan-500 rounded-lg p-3 group-hover:scale-110 transition-transform">
                <Users size={28} className="text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">Teams</h3>
            <p className="text-slate-400">Manage teams and team leaders</p>
          </a>

          <a
            href="/admin/attendance-records"
            className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700 hover:shadow-2xl hover:border-indigo-500 transition-all group cursor-pointer"
          >
            <div className="mb-4">
              <div className="inline-block bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-lg p-3 group-hover:scale-110 transition-transform">
                <CheckCircle size={28} className="text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">Attendance Records</h3>
            <p className="text-slate-400">View attendance records by month</p>
          </a>

          <a
            href="/admin/monthly-employee-report"
            className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700 hover:shadow-2xl hover:border-green-500 transition-all group cursor-pointer"
          >
            <div className="mb-4">
              <div className="inline-block bg-gradient-to-br from-green-600 to-green-500 rounded-lg p-3 group-hover:scale-110 transition-transform">
                <TrendingUp size={28} className="text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors">Monthly Report</h3>
            <p className="text-slate-400">View monthly employee performance reports</p>
          </a>

          <a
            href="/admin/team-leaders-monthly-report"
            className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700 hover:shadow-2xl hover:border-orange-500 transition-all group cursor-pointer"
          >
            <div className="mb-4">
              <div className="inline-block bg-gradient-to-br from-orange-600 to-orange-500 rounded-lg p-3 group-hover:scale-110 transition-transform">
                <TrendingUp size={28} className="text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-orange-400 transition-colors">Team Leaders</h3>
            <p className="text-slate-400">View team leaders monthly performance</p>
          </a>

          <a
            href="/admin/commissions"
            className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700 hover:shadow-2xl hover:border-emerald-500 transition-all group cursor-pointer"
          >
            <div className="mb-4">
              <div className="inline-block bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-lg p-3 group-hover:scale-110 transition-transform">
                <DollarSign size={28} className="text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">Approve Commissions</h3>
            <p className="text-slate-400">Review and approve employee commissions</p>
          </a>

          <a
            href="/admin/settings"
            className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700 hover:shadow-2xl hover:border-amber-500 transition-all group cursor-pointer"
          >
            <div className="mb-4">
              <div className="inline-block bg-gradient-to-br from-amber-600 to-amber-500 rounded-lg p-3 group-hover:scale-110 transition-transform">
                <BarChart3 size={28} className="text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">System Settings</h3>
            <p className="text-slate-400">Configure office location & commission rules</p>
          </a>

          <a
            href="/admin/logs"
            className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700 hover:shadow-2xl hover:border-pink-500 transition-all group cursor-pointer"
          >
            <div className="mb-4">
              <div className="inline-block bg-gradient-to-br from-pink-600 to-pink-500 rounded-lg p-3 group-hover:scale-110 transition-transform">
                <Shield size={28} className="text-white" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-pink-400 transition-colors">Admin Logs</h3>
            <p className="text-slate-400">View all admin actions and activity logs</p>
          </a>
        </div>
      </div>
    </div>
  );
}
