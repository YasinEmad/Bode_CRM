'use client';

import { useState } from 'react';
import CloseDealModal, { DealClosingFormData } from './CloseDealModal';
import { useAuth } from '@/hooks/useAuth';
import { Phone, Edit2, X, Save, MessageCircle } from 'lucide-react';

interface LeadCardProps {
  id: string;
  name: string;
  email: string;
  phone: string;
  property: string;
  project?: string;
  status: string;
  notes?: string;
  value?: number;
  onStatusChange?: (status: string, extra?: { proofImage?: string; info?: string; notes?: string }) => void;
  onNotesChange?: (notes: string) => void;
  assignableMembers?: { _id: string; name: string }[];
  onAssign?: (employeeId: string | null) => Promise<void> | void;
}

const statusColors: Record<string, { bg: string; text: string; border: string; label: string; icon: string }> = {
  new: { bg: 'from-blue-600 to-blue-700', text: 'text-blue-100', border: 'border-blue-500', label: 'New', icon: '✨' },
  connected: { bg: 'from-emerald-600 to-emerald-700', text: 'text-emerald-100', border: 'border-emerald-500', label: 'Connected', icon: '✓' },
  negotiation: { bg: 'from-amber-600 to-amber-700', text: 'text-amber-100', border: 'border-amber-500', label: 'Negotiation', icon: '💬' },
  closed: { bg: 'from-purple-600 to-purple-700', text: 'text-purple-100', border: 'border-purple-500', label: 'Closed', icon: '🎉' },
  low_budget: { bg: 'from-gray-600 to-gray-700', text: 'text-gray-100', border: 'border-gray-500', label: 'Low Budget', icon: '💸' },
  no_answer: { bg: 'from-orange-600 to-orange-700', text: 'text-orange-100', border: 'border-orange-500', label: 'No Answer', icon: '📞' },
  switched_off: { bg: 'from-red-600 to-red-700', text: 'text-red-100', border: 'border-red-500', label: 'Switched Off', icon: '🔴' },
};

export default function LeadCard({
  id,
  name,
  email,
  phone,
  property,
  project = '',
  status,
  notes = '',
  value = 0,
  onStatusChange,
  onNotesChange,
  assignableMembers,
  onAssign,
}: LeadCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editNotes, setEditNotes] = useState(notes);
  const [closeInfo, setCloseInfo] = useState('');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);
  const { token } = useAuth();
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [callConfirmation, setCallConfirmation] = useState<{ isOpen: boolean; phone: string; leadName: string }>({
    isOpen: false,
    phone: '',
    leadName: '',
  });

  const statusColor = statusColors[status] || { bg: 'from-slate-600 to-slate-700', text: 'text-slate-100', border: 'border-slate-500', label: status, icon: '•' };

  const handleWhatsApp = () => {
    try {
      if (!phone) {
        console.error('No phone number available');
        return;
      }

      let cleaned = phone.toString().trim();
      
      // Remove + if present (will add country code properly)
      if (cleaned.startsWith('+')) {
        cleaned = cleaned.substring(1);
      }
      
      // Remove all non-digit characters (spaces, dashes, etc.)
      let digits = cleaned.replace(/\D/g, '');
      
      let finalNumber = digits;
      
      // Handle different phone formats
      if (digits.startsWith('00')) {
        // International format like 00201256... → remove 00
        finalNumber = digits.substring(2);
      } else if (digits.startsWith('0')) {
        // Local Egyptian format like 0125... → remove 0 and add country code 20
        const localDigits = digits.substring(1);
        finalNumber = '20' + localDigits;
      } else if (digits.length === 10) {
        // Local format without leading 0, like 125... (assume Egypt)
        finalNumber = '20' + digits;
      }
      // else: assume it's already in international format (e.g., 201256...)
      
      // Validate: Egyptian number must be exactly 12 digits starting with 20
      if (finalNumber.length !== 12 || !finalNumber.startsWith('20')) {
        console.error('Invalid phone number. Expected format: 0XXXXXXXXXX or 201XXXXXXXXX');
        return;
      }
      
      // WhatsApp requires: https://wa.me/<number> without + or 00
      const url = `https://wa.me/${finalNumber}`;
      console.log('Opening WhatsApp with number:', finalNumber);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Failed to open WhatsApp:', err);
    }
  };

  const handleCall = () => {
    if (!phone) {
      console.error('No phone number available');
      return;
    }
    setCallConfirmation({
      isOpen: true,
      phone: phone,
      leadName: name,
    });
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
          <span className="text-slate-500 flex-shrink-0">🏷️</span>
          <div>
            <p className="text-xs text-slate-400">Project</p>
            <p className="text-slate-200 break-all text-xs sm:text-sm">{project || '—'}</p>
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
              <p className="text-emerald-400 font-semibold text-xs sm:text-sm">EGP {value.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={handleWhatsApp}
          className="flex-1 min-w-[80px] bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1"
        >
          <MessageCircle size={16} />
          <span>WhatsApp</span>
        </button>
        <button
          onClick={handleCall}
          className="flex-1 min-w-[80px] bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1"
        >
          <Phone size={16} className="hidden sm:block" />
          <span>Call</span>
        </button>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-1 min-w-[80px] bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1"
        >
          <Edit2 size={16} className="hidden sm:block" />
          <span>{isExpanded ? 'Close' : 'Edit'}</span>
        </button>
      </div>

      {/* Assignment controls (visible for team leaders via props) */}
      {assignableMembers && assignableMembers.length > 0 && (
        <div className="mb-4 flex gap-2 items-center">
          <select
            value={selectedAssignee}
            onChange={(e) => setSelectedAssignee(e.target.value)}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-xs sm:text-sm"
          >
            <option value="">-- Assign to --</option>
            {assignableMembers.map((m) => (
              <option key={m._id} value={m._id}>{m.name}</option>
            ))}
            <option value="__unassign">Unassign</option>
          </select>
          <button
            onClick={async () => {
              if (!onAssign) return;
              setIsAssigning(true);
              try {
                const empId = selectedAssignee === '__unassign' ? null : selectedAssignee || null;
                await onAssign(empId);
                setSelectedAssignee('');
              } catch (err) {
                console.error('Assign failed', err);
              } finally {
                setIsAssigning(false);
              }
            }}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold disabled:opacity-50"
            disabled={isAssigning}
          >
            {isAssigning ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      )}

      {/* Expanded Section */}
      {isExpanded && (
        <div className="border-t border-slate-600 pt-4 mt-4 space-y-4">
          {/* Status Selection */}
          <div>
            <label className="text-xs sm:text-sm font-semibold text-slate-300 block mb-2">Update Status</label>
              <select
              value={status}
              onChange={(e) => {
                const val = e.target.value;
                // Prevent reverting a closed lead back to 'new' at the UI level
                if (val === 'new' && status === 'closed') {
                  return;
                }
                if (val === 'closed') {
                    // open modal to collect full deal info before submitting
                    setShowCloseModal(true);
                } else {
                  onStatusChange?.(val);
                }
              }}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            >
              <option value="new" disabled={status === 'closed'}>✨ New</option>
              <option value="connected">✓ Connected</option>
              <option value="negotiation">💬 Negotiation</option>
              <option value="closed">🎉 Closed</option>
              <option value="low_budget">💸 Low Budget</option>
              <option value="no_answer">📞 No Answer</option>
              <option value="switched_off">🔴 Switched Off</option>
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

      {showCloseModal && (
        <CloseDealModal
          isOpen={showCloseModal}
          leadId={id}
          leadName={name}
          leadPhone={phone}
          leadProject={project}
          onClose={() => setShowCloseModal(false)}
          isSubmitting={isSubmittingClose}
          token={token || ''}
          onSubmit={async (data: DealClosingFormData) => {
            try {
              setIsSubmittingClose(true);
              const res = await fetch('/api/deal-closing', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ leadId: id, ...data }),
              });

              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to close deal');
              }

              // Deal closing API already updates the lead status, so just close the modal
              // Do NOT call onStatusChange because that would try to update the lead again
              setShowCloseModal(false);
              setIsExpanded(false);
            } catch (err) {
              console.error('Close deal failed', err);
            } finally {
              setIsSubmittingClose(false);
            }
          }}
        />
      )}

      {/* Call Confirmation Modal */}
      {callConfirmation.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600/20 to-red-600/10 border-b border-red-500/30 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="bg-red-500/20 p-3 rounded-lg">
                  <Phone className="text-red-400" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white">Initiate Call</h3>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6 space-y-4">
              <p className="text-slate-300">
                Are you sure you want to call the following phone number?
              </p>
              <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-2">Lead Name:</p>
                <p className="text-sm font-semibold text-blue-400 mb-4">{callConfirmation.leadName}</p>
                <p className="text-xs text-slate-400 mb-2">Phone Number:</p>
                <p className="text-lg font-bold text-white font-mono">{callConfirmation.phone}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-slate-700 bg-slate-900/50">
              <button
                onClick={() => setCallConfirmation({ isOpen: false, phone: '', leadName: '' })}
                className="flex-1 px-4 py-2 text-slate-300 border border-slate-600 rounded-lg hover:bg-slate-700/50 hover:text-white transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const phoneNumber = callConfirmation.phone.replace(/\D/g, '');
                  if (phoneNumber) {
                    window.location.href = `tel:${phoneNumber}`;
                    setCallConfirmation({ isOpen: false, phone: '', leadName: '' });
                  }
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all font-medium flex items-center justify-center gap-2 shadow-lg hover:shadow-red-500/50"
              >
                <Phone size={18} />
                Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
