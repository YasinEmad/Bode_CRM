'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import AdminLogsTable from '@/components/AdminLogsTable';
import AdminLogDetailModal from '@/components/AdminLogDetailModal';
import { Download, Trash2 } from 'lucide-react';

interface LogItem {
  _id: string;
  type: 'admin_action' | 'assignment';
  createdAt: string;
  actor?: { _id: string; name?: string; email?: string } | null;
  action: string;
  resourceType: string;
  resourceName?: string;
  description?: string;
  reason?: string;
  from?: { _id: string; name?: string } | null;
  to?: { _id: string; name?: string } | null;
  lead?: { _id: string; name?: string } | null;
}

export default function AdminLogsPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [logs, setLogs] = useState<LogItem[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [logType, setLogType] = useState<'all' | 'admin' | 'assignment'>('all');
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && user.role !== 'admin') {
      router.push('/unauthorized');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!token) return;
    fetchLogs();
  }, [token, page, searchQuery, startDate, endDate, logType]);

  async function fetchLogs() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      params.set('logType', logType);
      if (searchQuery) params.set('search', searchQuery);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/admin/logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setLogs([]);
        return;
      }
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching logs', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function exportToCSV() {
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '10000');
      params.set('logType', logType);
      if (searchQuery) params.set('search', searchQuery);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/admin/logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        alert('Failed to export');
        return;
      }

      const data = await res.json();
      const allLogs = data.logs || [];

      const headers = ['Timestamp', 'Admin', 'Action', 'Resource Type', 'Resource Name', 'Description'];
      const rows = allLogs.map((l: LogItem) => [
        new Date(l.createdAt).toLocaleString(),
        l.actor?.name || '',
        l.action || '',
        l.resourceType || '',
        l.resourceName || '',
        l.description || l.reason || '',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `admin-logs-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting CSV', err);
      alert('Export failed');
    }
  }

  function handleResetFilters() {
    setPage(1);
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
  }

  async function handleDeleteAllLogs() {
    setIsDeleting(true);
    try {
      const res = await fetch('/api/admin/logs', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        alert('Failed to delete logs');
        return;
      }

      const data = await res.json();
      setShowDeleteModal(false);
      setLogs([]);
      setTotal(0);
      alert(`✅ Successfully deleted ${data.totalDeleted} logs`);
    } catch (err) {
      console.error('Error deleting logs:', err);
      alert('Failed to delete logs');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Admin Logs</h1>
        <p className="text-slate-400">Track all administrative actions and lead assignments</p>
      </div>

      {/* Top Actions */}
      <div className="flex justify-end gap-3 mb-6">
        <button 
          onClick={() => setShowDeleteModal(true)} 
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white rounded-lg font-medium transition-all shadow-lg"
        >
          <Trash2 size={18} />
          Delete All Logs
        </button>
        <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-lg font-medium transition-all shadow-lg">
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Log Type Filter Tabs */}
      <div className="mb-6 flex gap-3 flex-wrap">
        {(['all', 'admin', 'assignment'] as const).map((type) => (
          <button
            key={type}
            onClick={() => {
              setLogType(type);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              logType === type 
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {type === 'all' && '📋 All Logs'}
            {type === 'admin' && '🔐 Admin Actions'}
            {type === 'assignment' && '👥 Lead Assignments'}
          </button>
        ))}
      </div>

      {/* Search & Filter Card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 shadow-xl rounded-xl p-6 mb-6 border border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">🔍</span>
          </div>
          <h2 className="text-lg font-semibold text-white">Filters</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Search Description</label>
            <input 
              type="text" 
              placeholder="Search logs..." 
              value={searchQuery} 
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} 
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">From</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }} 
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">To</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }} 
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex items-end gap-2">
            <button 
              onClick={handleResetFilters} 
              className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-medium transition-all"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <AdminLogsTable logs={logs} loading={isLoading} onViewDetails={setSelectedLog} />

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-between bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="text-sm text-slate-400">
          Showing <span className="font-semibold text-white">page {page}</span> • <span className="font-semibold text-white">{total}</span> total {total === 1 ? 'log' : 'logs'}
        </div>
        <div className="flex gap-2">
          <button 
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:opacity-50 text-slate-300 rounded-lg font-medium transition-all" 
            onClick={() => setPage((p) => Math.max(1, p - 1))} 
            disabled={page === 1}
          >
            ← Previous
          </button>
          <button 
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:opacity-50 text-slate-300 rounded-lg font-medium transition-all" 
            onClick={() => setPage((p) => p + 1)} 
            disabled={page * limit >= total}
          >
            Next →
          </button>
        </div>
      </div>

      <AdminLogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />

      {/* Delete All Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
            <div className="p-6 border-b border-slate-600 bg-gradient-to-r from-red-600/20 to-red-500/20">
              <h2 className="text-2xl font-bold text-white">🗑️ Delete All Logs</h2>
              <p className="text-slate-400 text-sm mt-1">This action cannot be undone</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-slate-300">
                  Are you sure you want to permanently delete all <span className="font-semibold text-white">{total}</span> logs?
                </p>
                <p className="text-slate-400 text-sm mt-2">
                  This will delete all admin actions and assignment logs from the system. This action cannot be reversed.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAllLogs}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete All'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
