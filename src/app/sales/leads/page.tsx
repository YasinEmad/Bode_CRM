'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, Edit2, Phone, Mail, MessageSquare, X, Save } from 'lucide-react';

interface Lead {
  _id: string;
  name: string;
  budget: number;
  phone: string;
  status: 'new' | 'connected' | 'negotiation' | 'pending_closed' | 'closed_pending_approval' | 'closed' | 'lost';
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

  const handleStatusChange = async (leadId: string, newStatus: string) => {
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
      
      // Show specific message when status is changed to closed
      if (newStatus === 'closed') {
        const commission = Math.round((data.lead.budget * 0.05 + Number.EPSILON) * 100) / 100;
        addToast(
          `✅ Deal closed! Commission ($${commission.toLocaleString()}) submitted for admin approval`,
          'success'
        );
      } else {
        addToast('✅ Status updated!', 'success');
      }
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Failed to update status',
        'error'
      );
    } finally {
      setStatusUpdating(null);
    }
  };

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
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">My Leads</h1>
          <p className="text-slate-400">Manage and track your assigned leads</p>
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
          <div className="bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-white">Name</th>
                    <th className="px-6 py-4 text-left font-bold text-white">Budget</th>
                    <th className="px-6 py-4 text-left font-bold text-white">Phone</th>
                    <th className="px-6 py-4 text-left font-bold text-white">Source</th>
                    <th className="px-6 py-4 text-left font-bold text-white">Status</th>
                    <th className="px-6 py-4 text-left font-bold text-white">Notes</th>
                    <th className="px-6 py-4 text-center font-bold text-white">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {leads.map((lead) => (
                    <tr key={lead._id} className="hover:bg-slate-700 transition">
                      <td className="px-6 py-4 font-semibold text-white">{lead.name}</td>
                      <td className="px-6 py-4 text-slate-300">${lead.budget.toLocaleString()}</td>
                      <td className="px-6 py-4 text-slate-300">{lead.phone}</td>
                      <td className="px-6 py-4 text-slate-300 capitalize">{lead.source}</td>
                      <td className="px-6 py-4">
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                          disabled={statusUpdating === lead._id}
                          className={`px-3 py-1 rounded-lg text-xs font-medium border-0 cursor-pointer transition ${
                            (statusColors[lead.status]?.bg || 'bg-slate-200')
                          } ${(statusColors[lead.status]?.text || 'text-slate-800')} ${statusUpdating === lead._id ? 'opacity-50' : ''}`}
                        >
                          <option value="new">New</option>
                          <option value="connected">Connected</option>
                          <option value="negotiation">Negotiation</option>
                          <option value="closed">Closed</option>
                          <option value="lost">Lost</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-300 text-sm line-clamp-2">{lead.notes || '-'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <button
                            onClick={() => window.location.href = `tel:${lead.phone}`}
                            title="Call"
                            className="p-2 text-emerald-400 hover:bg-emerald-500 hover:bg-opacity-20 rounded-lg transition"
                          >
                            <Phone size={18} />
                          </button>
                          <button
                            onClick={() => window.location.href = `mailto:${lead.phone}`}
                            title="Contact"
                            className="p-2 text-blue-400 hover:bg-blue-500 hover:bg-opacity-20 rounded-lg transition"
                          >
                            <Mail size={18} />
                          </button>
                          <button
                            onClick={() => handleEditLead(lead)}
                            title="Edit Notes"
                            className="p-2 text-amber-400 hover:bg-amber-500 hover:bg-opacity-20 rounded-lg transition"
                          >
                            <Edit2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                  <p className="text-sm text-slate-300 mt-2"><span className="font-semibold">Budget:</span> ${editingLead.budget.toLocaleString()}</p>
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

      </div>
    </div>
  );
}
