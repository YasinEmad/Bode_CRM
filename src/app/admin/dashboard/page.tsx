'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, TrendingUp, DollarSign, CheckCircle } from 'lucide-react';

export default function AdminDashboard() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalLeads: 0,
    closedDeals: 0,
    totalCommissions: 0,
    activeEmployees: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);

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
      // Fetch sample data
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

      const closedDeals = leads.filter((l: any) => l.status === 'closed').length;
      const totalCommissions = commissions.reduce((sum: number, c: any) => sum + (c.amount || 0), 0);

      setStats({
        totalLeads: leads.length,
        closedDeals,
        totalCommissions,
        activeEmployees: employees.length,
      });

      // Mock chart data
      setChartData([
        { month: 'Jan', leads: 12, closed: 3, commission: 9000 },
        { month: 'Feb', leads: 19, closed: 5, commission: 15000 },
        { month: 'Mar', leads: 15, closed: 2, commission: 6000 },
        { month: 'Apr', leads: 25, closed: 8, commission: 24000 },
      ]);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Leads</p>
                <p className="text-3xl font-bold text-gray-800">{stats.totalLeads}</p>
              </div>
              <TrendingUp size={32} className="text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Closed Deals</p>
                <p className="text-3xl font-bold text-gray-800">{stats.closedDeals}</p>
              </div>
              <CheckCircle size={32} className="text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Commission</p>
                <p className="text-3xl font-bold text-gray-800">${(stats.totalCommissions / 1000).toFixed(1)}K</p>
              </div>
              <DollarSign size={32} className="text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Employees</p>
                <p className="text-3xl font-bold text-gray-800">{stats.activeEmployees}</p>
              </div>
              <Users size={32} className="text-orange-500" />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Performance Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="leads" stroke="#3b82f6" />
                <Line type="monotone" dataKey="closed" stroke="#10b981" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Commission by Month</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="commission" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a
            href="/admin/leads"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <h3 className="text-lg font-bold text-gray-800 mb-2">Manage Leads</h3>
            <p className="text-gray-600">Create, assign, and track leads</p>
          </a>

          <a
            href="/admin/commissions"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <h3 className="text-lg font-bold text-gray-800 mb-2">Approve Commissions</h3>
            <p className="text-gray-600">Review and approve employee commissions</p>
          </a>

          <a
            href="/admin/settings"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <h3 className="text-lg font-bold text-gray-800 mb-2">System Settings</h3>
            <p className="text-gray-600">Configure office location & rules</p>
          </a>
        </div>
      </div>
    </div>
  );
}
