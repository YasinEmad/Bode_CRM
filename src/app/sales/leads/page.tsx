'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, Edit2, Phone, Mail, X, Save, Plus, AlertTriangle, Search } from 'lucide-react';
import CloseDealModal, { DealClosingFormData } from '@/components/CloseDealModal';
import LeadCard from '@/components/LeadCard';

interface Lead {
  _id: string;
  name: string;
  project?: string;
  phone: string;
  email?: string;
  status: 'new' | 'connected' | 'negotiation' | 'pending_closed' | 'closed_pending_approval' | 'closed' | 'rejected' | 'lost';
  source: string;
  notes: string;
  assignedTo?: { _id: string; name: string };
}

const statusColors: Record<string, { bg: string; text: string }> = {
  new: { bg: 'bg-blue-100', text: 'text-blue-800' },
  connected: { bg: 'bg-green-100', text: 'text-green-800' },
  negotiation: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  closed: { bg: 'bg-purple-100', text: 'text-purple-800' },
  pending_closed: { bg: 'bg-purple-50', text: 'text-purple-700' },
  closed_pending_approval: { bg: 'bg-purple-200', text: 'text-purple-900' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800' },
  lost: { bg: 'bg-red-100', text: 'text-red-800' },
};

export default function SalesLeads() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast, updateToast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [closingLeadId, setClosingLeadId] = useState<string | null>(null);
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [newLeadData, setNewLeadData] = useState({
    name: '',
    phone: '',
    email: '',
    project: '',
    source: 'other',
    notes: '',
  });
  const [callConfirmation, setCallConfirmation] = useState<{ isOpen: boolean; phone: string; leadName: string }>({
    isOpen: false,
    phone: '',
    leadName: '',
  });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'sales')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (token && user) {
      fetchLeads();
    }
  }, [token, user]);

  const fetchLeads = async () => {
    try {
      const res = await fetch(`/api/leads?userId=${user?.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLeads(Array.isArray(data.leads) ? data.leads : []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      addToast('Failed to fetch leads', 'error');
    } finally {
      setLoadingLeads(false);
    }
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setEditNotes(lead.notes);
  };

  const handleCardStatusChange = async (leadId: string, newStatus: string) => {
    // LeadCard may already handle closing via its own modal and API.
    // For non-closed statuses, reuse existing handler which updates via API.
    if (newStatus === 'closed') {
      // Optimistically update local state and notify user
      setLeads((prev) => prev.map((l) => (l._id === leadId ? { ...l, status: 'closed' } : l)));
      addToast('✅ Deal closed', 'success');
      return;
    }
    await handleStatusChange(leadId, newStatus);
  };

  const handleUpdateNotes = async (leadId: string, notes: string) => {
    const toastId = addToast('Saving notes...', 'loading');
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save notes');
      setLeads((prev) => prev.map((l) => (l._id === leadId ? data.lead : l)));
      updateToast(toastId, '✅ Notes saved', 'success');
    } catch (err) {
      updateToast(toastId, err instanceof Error ? err.message : 'Failed to save notes', 'error');
    }
  };

  const handleCreateLead = async () => {
    if (!newLeadData.name || !newLeadData.phone) {
      addToast('Please fill in name and phone', 'error');
      return;
    }

    setIsSubmitting(true);
    const toastId = addToast('Creating lead...', 'loading');

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newLeadData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create lead');

      setLeads([data.lead, ...leads]);
      setNewLeadData({
        name: '',
        phone: '',
        email: '',
        project: '',
        source: 'other',
        notes: '',
      });
      setIsCreatingLead(false);
      updateToast(toastId, '✅ Lead created and assigned to you!', 'success');
    } catch (error) {
      updateToast(
        toastId,
        error instanceof Error ? error.message : 'Failed to create lead',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    if (newStatus === 'closed') {
      // Open modal to collect deal closing details
      setClosingLeadId(leadId);
      return;
    }

    setStatusUpdating(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      setLeads(leads.map((l) => (l._id === leadId ? data.lead : l)));
      addToast('✅ Status updated!', 'success');
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Failed to update status',
        'error'
      );
    } finally {
      setStatusUpdating(null);
    }
  };

  // Close lead handled via CloseDealModal which posts to /api/deal-closing

  const handleEditSubmit = async () => {
    if (!editingLead) return;

    setIsSubmitting(true);
    const toastId = addToast('Updating notes...', 'loading');

    try {
      const res = await fetch(`/api/leads/${editingLead._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          notes: editNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update notes');

      setLeads(leads.map((l) => (l._id === editingLead._id ? data.lead : l)));
      updateToast(toastId, '✅ Notes updated successfully!', 'success');
      setEditingLead(null);
    } catch (error) {
      updateToast(
        toastId,
        error instanceof Error ? error.message : 'Failed to update notes',
        'error'
      );
    } finally {
      setIsSubmitting(false);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">My Leads</h1>
              <p className="text-slate-400">Manage and track your assigned leads</p>
            </div>
            <button
              onClick={() => setIsCreatingLead(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2 whitespace-nowrap"
            >
              <Plus size={20} /> Add New Lead
            </button>
          </div>
        </div>

        {loadingLeads ? (
          <div className="flex items-center justify-center py-20">
            <Loader size={40} className="animate-spin text-blue-400" />
          </div>
        ) : leads.length === 0 ? (
          <div className="bg-slate-700 rounded-2xl shadow-xl p-16 text-center border border-slate-600">
            <p className="text-slate-300 text-lg">🤷 No leads assigned yet</p>
          </div>
        ) : (
          <div className="">
            {/* Filters + Search bar */}
            <div className="mb-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex-1 w-full sm:max-w-md">
                <div className="relative">
                  <input
                    placeholder="Search leads by name, phone or email..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search size={18} />
                  </div>
                </div>
              </div>

              <div className="w-full sm:w-56">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white"
                >
                  <option value="">All statuses</option>
                  <option value="new">New</option>
                  <option value="connected">Connected</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="closed">Closed</option>
                  <option value="rejected">Rejected</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
            </div>

            {/* Grid of cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {leads
                .filter((l) => {
                  if (statusFilter && l.status !== statusFilter) return false;
                  if (!searchText) return true;
                  const q = searchText.toLowerCase();
                  return (
                    l.name.toLowerCase().includes(q) ||
                    (l.email || '').toLowerCase().includes(q) ||
                    (l.phone || '').toLowerCase().includes(q) ||
                    (l.project || '').toLowerCase().includes(q)
                  );
                })
                .map((lead) => (
                  <LeadCard
                    key={lead._id}
                    id={lead._id}
                    name={lead.name}
                    email={lead.email || ''}
                    phone={lead.phone}
                    property={lead.source}
                    project={lead.project}
                    status={lead.status}
                    notes={lead.notes}
                    onStatusChange={(newStatus) => handleCardStatusChange(lead._id, newStatus)}
                    onNotesChange={(notes) => handleUpdateNotes(lead._id, notes)}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Create Lead Modal */}
        {isCreatingLead && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-700 flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-gradient-to-r from-slate-900 to-slate-800 flex-shrink-0">
                <h2 className="text-2xl font-bold text-white">Add New Lead</h2>
                <button
                  onClick={() => setIsCreatingLead(false)}
                  className="text-slate-400 hover:text-white transition"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Name *</label>
                  <input
                    type="text"
                    placeholder="Enter client name"
                    value={newLeadData.name}
                    onChange={(e) => setNewLeadData({ ...newLeadData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-700 placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Phone *</label>
                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    value={newLeadData.phone}
                    onChange={(e) => setNewLeadData({ ...newLeadData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-700 placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Email</label>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={newLeadData.email}
                    onChange={(e) => setNewLeadData({ ...newLeadData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-700 placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Project</label>
                  <input
                    type="text"
                    placeholder="Enter project name"
                    value={newLeadData.project}
                    onChange={(e) => setNewLeadData({ ...newLeadData, project: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-700 placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Source</label>
                  <select
                    value={newLeadData.source}
                    onChange={(e) => setNewLeadData({ ...newLeadData, source: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-700"
                  >
                    <option value="website">Website</option>
                    <option value="referral">Referral</option>
                    <option value="phone">Phone</option>
                    <option value="email">Email</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="google ads">Google Ads</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Notes</label>
                  <textarea
                    placeholder="Add any notes about this lead..."
                    value={newLeadData.notes}
                    onChange={(e) => setNewLeadData({ ...newLeadData, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-700 placeholder-slate-400"
                    rows={3}
                  />
                </div>

                <div className="bg-blue-900 bg-opacity-30 p-3 rounded-lg border border-blue-700 text-sm text-blue-200">
                  ℹ️ This lead will be automatically assigned to you
                </div>
              </div>

              <div className="p-6 border-t border-slate-700 bg-slate-900 flex gap-3 flex-col sm:flex-row flex-shrink-0">
                <button
                  onClick={handleCreateLead}
                  disabled={isSubmitting}
                  className="w-full sm:flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Creating...' : <><Plus size={18} /> Create Lead</> }
                </button>
                <button
                  onClick={() => setIsCreatingLead(false)}
                  className="w-full sm:flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-semibold transition border border-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Notes Modal */}
        {editingLead && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-700">
              <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-gradient-to-r from-slate-900 to-slate-800">
                <div>
                  <h2 className="text-2xl font-bold text-white">Edit Notes</h2>
                  <p className="text-slate-400 text-sm mt-1">{editingLead.name} • {editingLead.phone}</p>
                </div>
                <button
                  onClick={() => setEditingLead(null)}
                  className="text-slate-400 hover:text-white transition"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                  <p className="text-sm text-slate-300"><span className="font-semibold">Status:</span> <span className={`px-2 py-1 rounded text-xs font-medium ${(statusColors[editingLead.status]?.bg || 'bg-slate-200')} ${(statusColors[editingLead.status]?.text || 'text-slate-800')}`}>{editingLead.status.charAt(0).toUpperCase() + editingLead.status.slice(1)}</span></p>
                  <p className="text-sm text-slate-300 mt-2"><span className="font-semibold">Project:</span> {editingLead.project || '-'}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Add notes about this lead..."
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-700"
                    rows={4}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleEditSubmit}
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? 'Saving...' : <><Save size={18} /> Save Notes</> }
                  </button>
                  <button
                    onClick={() => setEditingLead(null)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-semibold transition border border-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Close Lead Modal (shared component) */}
        {closingLeadId && (
          <CloseDealModal
            isOpen={!!closingLeadId}
            leadId={closingLeadId!}
            leadName={leads.find((l) => l._id === closingLeadId)?.name || ''}
            leadPhone={leads.find((l) => l._id === closingLeadId)?.phone || ''}
            leadProject={leads.find((l) => l._id === closingLeadId)?.project || ''}
            onClose={() => setClosingLeadId(null)}
            isSubmitting={isSubmittingClose}
            token={token || ''}
            onSubmit={async (formData: DealClosingFormData) => {
              setIsSubmittingClose(true);
              const toastId = addToast('Closing deal...', 'loading');
              try {
                const res = await fetch('/api/deal-closing', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ leadId: closingLeadId, ...formData }),
                });

                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || 'Failed to close deal');

                // API returns updatedLead
                const updatedLead = data.updatedLead;
                if (updatedLead) {
                  const updatedId = typeof updatedLead._id === 'string' ? updatedLead._id : String((updatedLead as any)._id);
                  setLeads((prev) => prev.map((l) => (l._id === updatedId ? updatedLead : l)));
                }

                setClosingLeadId(null);
                updateToast(toastId, '✅ Deal closed and sent to admin for approval', 'success');
              } catch (err) {
                updateToast(toastId, err instanceof Error ? err.message : 'Failed to close deal', 'error');
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
                  هل أنت متأكد أنك تريد الاتصال على رقم الهاتف التالي؟
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
                    } else {
                      addToast('Invalid phone number', 'error');
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
    </div>
  );
}
