'use client';

import { useState } from 'react';
import { Phone, Mail, Edit2, X, Save } from 'lucide-react';

interface LeadCardProps {
  id: string;
  name: string;
  email: string;
  phone: string;
  property: string;
  status: 'new' | 'connected' | 'negotiation' | 'closed';
  notes?: string;
  value?: number;
  onStatusChange?: (status: string) => void;
  onNotesChange?: (notes: string) => void;
}

const statusColors: Record<string, { bg: string; text: string; border: string; label: string; icon: string }> = {
  new: { bg: 'from-blue-600 to-blue-700', text: 'text-blue-100', border: 'border-blue-500', label: 'New', icon: '✨' },
  connected: { bg: 'from-emerald-600 to-emerald-700', text: 'text-emerald-100', border: 'border-emerald-500', label: 'Connected', icon: '✓' },
  negotiation: { bg: 'from-amber-600 to-amber-700', text: 'text-amber-100', border: 'border-amber-500', label: 'Negotiation', icon: '💬' },
  closed: { bg: 'from-purple-600 to-purple-700', text: 'text-purple-100', border: 'border-purple-500', label: 'Closed', icon: '🎉' },
};

export default function LeadCard({
  id,
  name,
  email,
  phone,
  property,
  status,
  notes = '',
  value = 0,
  onStatusChange,
  onNotesChange,
}: LeadCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editNotes, setEditNotes] = useState(notes);

  const statusColor = statusColors[status];

  const handleCall = () => {
    window.location.href = `tel:${phone}`;
  };

  const handleEmail = () => {
    window.location.href = `mailto:${email}`;
  };

  const handleSaveNotes = () => {
    onNotesChange?.(editNotes);
    setIsExpanded(false);
  };

  return (
    <div className={`bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-lg hover:shadow-2xl transition-all p-6 border-l-4 ${statusColor.border} border border-slate-600 flex flex-col h-full`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-lg sm:text-xl font-bold text-white">{name}</h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">{property}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-gradient-to-r ${statusColor.bg} ${statusColor.text} flex items-center gap-1 whitespace-nowrap`}>
          <span>{statusColor.icon}</span>
          <span className="hidden sm:inline">{statusColor.label}</span>
        </div>
      </div>

      {/* Contact Details */}
      <div className="space-y-3 mb-4 flex-1">
        <div className="flex items-start gap-2 text-sm">
          <span className="text-slate-500 flex-shrink-0">✉️</span>
          <div>
            <p className="text-xs text-slate-400">Email</p>
            <p className="text-slate-200 break-all text-xs sm:text-sm">{email}</p>
          </div>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <span className="text-slate-500 flex-shrink-0">📱</span>
          <div>
            <p className="text-xs text-slate-400">Phone</p>
            <p className="text-slate-200 text-xs sm:text-sm">{phone}</p>
          </div>
        </div>
        {value > 0 && (
          <div className="flex items-start gap-2 text-sm">
            <span className="text-slate-500 flex-shrink-0">💰</span>
            <div>
              <p className="text-xs text-slate-400">Value</p>
              <p className="text-emerald-400 font-semibold text-xs sm:text-sm">${value.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={handleCall}
          className="flex-1 min-w-[80px] bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1"
        >
          <Phone size={16} className="hidden sm:block" />
          <span>Call</span>
        </button>
        <button
          onClick={handleEmail}
          className="flex-1 min-w-[80px] bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1"
        >
          <Mail size={16} className="hidden sm:block" />
          <span>Email</span>
        </button>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 min-w-[80px] bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1"
        >
          <Edit2 size={16} className="hidden sm:block" />
          <span>{isExpanded ? 'Close' : 'Edit'}</span>
        </button>
      </div>

      {/* Expanded Section */}
      {isExpanded && (
        <div className="border-t border-slate-600 pt-4 mt-4 space-y-4">
          {/* Status Selection */}
          <div>
            <label className="text-xs sm:text-sm font-semibold text-slate-300 block mb-2">Update Status</label>
            <select
              value={status}
              onChange={(e) => onStatusChange?.(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            >
              <option value="new">✨ New</option>
              <option value="connected">✓ Connected</option>
              <option value="negotiation">💬 Negotiation</option>
              <option value="closed">🎉 Closed</option>
            </select>
          </div>

          {/* Notes Section */}
          <div>
            <label className="text-xs sm:text-sm font-semibold text-slate-300 block mb-2">Notes</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder-slate-500"
              rows={3}
              placeholder="Add notes about this lead..."
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveNotes}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-xs sm:text-sm"
          >
            <Save size={16} />
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
