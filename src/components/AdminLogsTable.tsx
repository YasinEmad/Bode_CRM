import React from 'react';
import { Eye } from 'lucide-react';

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

export default function AdminLogsTable({
  logs,
  loading,
  onViewDetails,
}: {
  logs: LogItem[];
  loading: boolean;
  onViewDetails?: (log: LogItem) => void;
}) {
  const getResourceBadge = (type: string) => {
    const colors: Record<string, string> = {
      user: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      admin: 'bg-red-500/20 text-red-300 border border-red-500/30',
      employee: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
      lead: 'bg-green-500/20 text-green-300 border border-green-500/30',
      'system-settings': 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
      'kpi-settings': 'bg-violet-500/20 text-violet-300 border border-violet-500/30',
      commission: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
      team: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
      'leads': 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
    };
    return colors[type] || 'bg-slate-500/20 text-slate-300 border border-slate-500/30';
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      create: 'bg-green-500/20 text-green-300 border border-green-500/30',
      update: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      delete: 'bg-red-500/20 text-red-300 border border-red-500/30',
      approve: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
      reject: 'bg-red-500/20 text-red-300 border border-red-500/30',
      assign: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
      'bulk-assign': 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
    };
    return colors[action] || 'bg-slate-500/20 text-slate-300 border border-slate-500/30';
  };

  return (
    <div className="overflow-x-auto bg-slate-800 shadow-xl rounded-xl border border-slate-700">
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-700">
          <tr>
            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Timestamp</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Admin</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Action</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Resource</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Description</th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Details</th>
          </tr>
        </thead>
        <tbody className="bg-slate-800 divide-y divide-slate-700">
          {loading ? (
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full animate-spin"></div>
                  <p className="text-slate-400">Loading logs...</p>
                </div>
              </td>
            </tr>
          ) : logs.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-8 text-center">
                <div className="flex flex-col items-center gap-3">
                  <span className="text-4xl">📋</span>
                  <p className="text-slate-400 font-medium">No logs found</p>
                  <p className="text-slate-500 text-sm">Try adjusting your filters</p>
                </div>
              </td>
            </tr>
          ) : (
            logs.map((l) => (
              <tr key={l._id} className={`hover:bg-slate-700/50 transition-colors border-l-4 ${l.type === 'admin_action' ? 'border-red-500' : 'border-blue-500'}`}>
                <td className="px-6 py-4 text-sm whitespace-nowrap">
                  <div className="font-medium text-white">
                    {new Date(l.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {l.type === 'admin_action' ? (
                      <span className="inline-block px-2 py-1 bg-red-500/20 text-red-300 rounded border border-red-500/30">🔐 Admin Action</span>
                    ) : (
                      <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">👥 Assignment</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="font-medium text-white">{l.actor?.name || '—'}</div>
                  {l.actor?.email && <div className="text-xs text-slate-400">{l.actor.email}</div>}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${getActionBadge(l.action)}`}>
                    {l.action.charAt(0).toUpperCase() + l.action.slice(1).replace('-', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex flex-col gap-2">
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold w-fit ${getResourceBadge(l.resourceType)}`}>
                      {l.resourceType.replace('-', ' ')}
                    </span>
                    {l.resourceName && <div className="text-xs text-slate-300 font-medium">{l.resourceName}</div>}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="truncate max-w-xs text-slate-300" title={l.description || l.reason || ''}>
                    {l.description || l.reason || '—'}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">
                  {onViewDetails && (
                    <button
                      onClick={() => onViewDetails(l)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg font-medium transition-all border border-blue-500/30"
                      title="View full details"
                    >
                      <Eye size={16} />
                      View
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
