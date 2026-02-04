'use client';

import React from 'react';
import { X } from 'lucide-react';

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
  details?: Record<string, any>;
  from?: { _id: string; name?: string } | null;
  to?: { _id: string; name?: string } | null;
  lead?: { _id: string; name?: string } | null;
}

export default function AdminLogDetailModal({
  log,
  onClose,
}: {
  log: LogItem | null;
  onClose: () => void;
}) {
  if (!log) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden border border-slate-700 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600 bg-gradient-to-r from-slate-800 to-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">Log Details</h2>
            <p className="text-sm text-slate-400 mt-1">Complete information for this action</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* Timestamp */}
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
            <label className="font-semibold text-slate-300 text-sm block mb-2">📅 Timestamp</label>
            <p className="text-white font-mono text-sm">{new Date(log.createdAt).toLocaleString()}</p>
          </div>

          {/* Admin/Actor */}
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
            <label className="font-semibold text-slate-300 text-sm block mb-2">👤 Actor</label>
            <p className="text-white font-medium">{log.actor?.name || '—'}</p>
            {log.actor?.email && (
              <p className="text-slate-400 text-xs mt-1">{log.actor.email}</p>
            )}
          </div>

          {/* Action & Resource Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <label className="font-semibold text-slate-300 text-sm block mb-2">⚡ Action</label>
              <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm font-semibold border border-blue-500/30">
                {log.action.charAt(0).toUpperCase() + log.action.slice(1).replace('-', ' ')}
              </span>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <label className="font-semibold text-slate-300 text-sm block mb-2">📦 Resource Type</label>
              <span className="inline-block px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm font-semibold border border-purple-500/30">
                {log.resourceType.replace('-', ' ')}
              </span>
            </div>
          </div>

          {/* Resource Name */}
          {log.resourceName && (
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <label className="font-semibold text-slate-300 text-sm block mb-2">📝 Resource Name</label>
              <p className="text-white">{log.resourceName}</p>
            </div>
          )}

          {/* Description */}
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
            <label className="font-semibold text-slate-300 text-sm block mb-2">📄 Description</label>
            <p className="text-slate-300 whitespace-pre-wrap break-words">{log.description || log.reason || '—'}</p>
          </div>

          {/* Assignment Details */}
          {log.type === 'assignment' && (
            <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30 space-y-3">
              <h3 className="font-semibold text-blue-300 text-sm">📋 Assignment Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-xs block mb-1">From</label>
                  <p className="text-white font-medium">{log.from?.name || '—'}</p>
                </div>
                <div>
                  <label className="text-slate-400 text-xs block mb-1">To</label>
                  <p className="text-white font-medium">{log.to?.name || '—'}</p>
                </div>
              </div>
              {log.lead && (
                <div>
                  <label className="text-slate-400 text-xs block mb-1">Lead</label>
                  <p className="text-white font-medium">{log.lead.name}</p>
                </div>
              )}
            </div>
          )}

          {/* Details JSON */}
          {log.details && Object.keys(log.details).length > 0 && (
            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <label className="font-semibold text-slate-300 text-sm block mb-3">🔍 Additional Details</label>
              <div className="space-y-2">
                {Object.entries(log.details).map(([key, value]) => {
                  const displayValue = (() => {
                    if (value === null || value === undefined) return '—';
                    if (typeof value === 'boolean') return value ? '✓ Yes' : '✗ No';
                    if (Array.isArray(value)) {
                      if (value.length === 0) return 'Empty array';
                      if (typeof value[0] === 'object') {
                        return `${value.length} items`;
                      }
                      return value.join(', ');
                    }
                    if (typeof value === 'object') return 'Object';
                    return String(value);
                  })();

                  return (
                    <div key={key} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                      <div className="text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="text-white break-words">
                        {Array.isArray(value) && typeof value[0] === 'object' ? (
                          <div className="space-y-1 mt-2">
                            {value.map((item: any, idx: number) => (
                              <div key={idx} className="text-sm bg-slate-900/50 rounded px-2 py-1 text-slate-300">
                                {typeof item === 'object' && item !== null ? (
                                  Object.entries(item).map(([k, v]) => (
                                    <div key={k} className="text-xs">
                                      <span className="text-slate-400">{k}:</span> {String(v)}
                                    </div>
                                  ))
                                ) : (
                                  String(item)
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          displayValue
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Log ID */}
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
            <label className="font-semibold text-slate-300 text-sm block mb-2">🔑 Log ID</label>
            <p className="text-slate-400 text-xs font-mono break-all">{log._id}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-600 bg-slate-900/50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white rounded-lg font-medium transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
