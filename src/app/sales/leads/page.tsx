'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, Edit2, Phone, Mail, MessageSquare, X, Save, TrendingUp } from 'lucide-react';

interface Lead {
  _id: string;
  name: string;
  budget: number;
  phone: string;
  status: 'new' | 'connected' | 'negotiation' | 'closed' | 'lost';
  source: string;
  notes: string;
  assignedTo?: { _id: string; name: string };
}

const statusColors: Record<string, { bg: string; text: string }> = {
  new: { bg: 'bg-blue-100', text: 'text-blue-800' },
  connected: { bg: 'bg-green-100', text: 'text-green-800' },
  negotiation: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  closed: { bg: 'bg-purple-100', text: 'text-purple-800' },
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
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [commissionPercentage, setCommissionPercentage] = useState('5');
  const [isSubmittingCommission, setIsSubmittingCommission] = useState(false);

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

  const handleSubmitCommission = async () => {
    if (!selectedLead) return;

    setIsSubmittingCommission(true);
    const toastId = addToast('Submitting commission for approval...', 'loading');

    try {
      const res = await fetch('/api/commissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          dealId: selectedLead._id,
          employeeId: user?.id,
          percentage: parseFloat(commissionPercentage),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit commission');

      updateToast(toastId, '✅ Commission submitted for admin approval!', 'success');
      setShowCommissionModal(false);
      setSelectedLead(null);
      setCommissionPercentage('5');
    } catch (error) {
      updateToast(
        toastId,
        error instanceof Error ? error.message : 'Failed to submit commission',
        'error'
      );
    } finally {
      setIsSubmittingCommission(false);
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800">My Leads</h1>
          <p className="text-gray-600 mt-2">Manage and track your assigned leads</p>
        </div>

        {loadingLeads ? (
          <div className="flex items-center justify-center py-12">
            <Loader size={32} className="animate-spin text-blue-600" />
          </div>
        ) : leads.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">No leads assigned yet</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Name</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Budget</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Phone</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Source</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Notes</th>
                    <th className="px-6 py-3 text-center font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leads.map((lead) => (
                    <tr key={lead._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-semibold text-gray-800">{lead.name}</td>
                      <td className="px-6 py-4 text-gray-700">${lead.budget.toLocaleString()}</td>
                      <td className="px-6 py-4 text-gray-700">{lead.phone}</td>
                      <td className="px-6 py-4 text-gray-700 capitalize">{lead.source}</td>
                      <td className="px-6 py-4">
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                          disabled={statusUpdating === lead._id}
                          className={`px-3 py-1 rounded-lg text-xs font-medium border-0 cursor-pointer ${
                            statusColors[lead.status].bg
                          } ${statusColors[lead.status].text} ${statusUpdating === lead._id ? 'opacity-50' : ''}`}
                        >
                          <option value="new">New</option>
                          <option value="connected">Connected</option>
                          <option value="negotiation">Negotiation</option>
                          <option value="closed">Closed</option>
                          <option value="lost">Lost</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-600 text-sm line-clamp-2">{lead.notes || '-'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <button
                            onClick={() => window.location.href = `tel:${lead.phone}`}
                            title="Call"
                            className="p-2 text-green-600 hover:bg-green-100 rounded transition"
                          >
                            <Phone size={18} />
                          </button>
                          <button
                            onClick={() => window.location.href = `mailto:${lead.phone}`}
                            title="Contact"
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded transition"
                          >
                            <Mail size={18} />
                          </button>
                          <button
                            onClick={() => handleEditLead(lead)}
                            title="Edit Notes"
                            className="p-2 text-orange-600 hover:bg-orange-100 rounded transition"
                          >
                            <Edit2 size={18} />
                          </button>
                          {lead.status === 'closed' && (
                            <button
                              onClick={() => {
                                setSelectedLead(lead);
                                setShowCommissionModal(true);
                              }}
                              title="Submit Commission"
                              className="p-2 text-green-700 hover:bg-green-100 rounded transition font-semibold"
                            >
                              <TrendingUp size={18} />
                            </button>
                          )}
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full">
              <div className="flex justify-between items-center p-6 border-b">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Edit Notes</h2>
                  <p className="text-gray-600 text-sm mt-1">{editingLead.name} • {editingLead.phone}</p>
                </div>
                <button
                  onClick={() => setEditingLead(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600"><span className="font-semibold">Status:</span> <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[editingLead.status].bg} ${statusColors[editingLead.status].text}`}>{editingLead.status.charAt(0).toUpperCase() + editingLead.status.slice(1)}</span></p>
                  <p className="text-sm text-gray-600 mt-2"><span className="font-semibold">Budget:</span> ${editingLead.budget.toLocaleString()}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Add notes about this lead..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 bg-white"
                    rows={4}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleEditSubmit}
                    disabled={isSubmitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? 'Saving...' : <><Save size={18} /> Save Notes</> }
                  </button>
                  <button
                    onClick={() => setEditingLead(null)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-semibold transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Commission Submission Modal */}
        {showCommissionModal && selectedLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">Submit Commission</h2>
                <button
                  onClick={() => {
                    setShowCommissionModal(false);
                    setSelectedLead(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700"><span className="font-semibold">Deal Name:</span> {selectedLead.name}</p>
                  <p className="text-sm text-gray-700 mt-2"><span className="font-semibold">Deal Price:</span> ${selectedLead.budget.toLocaleString()}</p>
                  <p className="text-sm text-gray-700 mt-2"><span className="font-semibold">Sales Person:</span> {user?.name}</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Commission Percentage (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={commissionPercentage}
                    onChange={(e) => setCommissionPercentage(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                  />
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700"><span className="font-semibold">Estimated Commission:</span> ${(selectedLead.budget * (parseFloat(commissionPercentage) / 100)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handleSubmitCommission}
                    disabled={isSubmittingCommission}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    {isSubmittingCommission ? (
                      <>
                        <Loader size={18} className="animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <TrendingUp size={18} />
                        Submit for Approval
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowCommissionModal(false);
                      setSelectedLead(null);
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-semibold transition"
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
