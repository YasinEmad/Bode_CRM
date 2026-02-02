'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, Edit2, Phone, Mail, X, Save, Plus, AlertTriangle } from 'lucide-react';

interface Lead {
  _id: string;
  name: string;
  project?: string;
  phone: string;
  email?: string;
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
  const [closingLeadId, setClosingLeadId] = useState<string | null>(null);
  const [closeFormData, setCloseFormData] = useState({ project: '', info: '', proofImage: '' });
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);
  const [isCreatingLead, setIsCreatingLead] = useState(false);
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
      // Open modal to collect project, notes, and proof image
      const lead = leads.find((l) => l._id === leadId);
      setClosingLeadId(leadId);
      setCloseFormData({
          project: lead?.project || '',
          info: '',
          proofImage: '',
        });
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

  const handleSubmitCloseLead = async () => {
    if (!closingLeadId) return;

      if (!closeFormData.project || !closeFormData.info || !closeFormData.proofImage) {
        addToast('Please fill in project, info, and proof image', 'error');
      return;
    }

    setIsSubmittingClose(true);
    const toastId = addToast('Closing deal...', 'loading');

    try {
      // If proofImage is a data URI, try uploading it client-side to ImageKit
      let proofImageUrl = closeFormData.proofImage;

      if (typeof proofImageUrl === 'string' && proofImageUrl.startsWith('data:')) {
        const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
        if (publicKey) {
          try {
            const fileName = `proof_${Date.now()}.png`;
            const form = new FormData();
            form.append('file', proofImageUrl);
            form.append('fileName', fileName);
            form.append('publicKey', publicKey);
            form.append('useUniqueFileName', 'true');

            const uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
              method: 'POST',
              body: form,
            });

            const uploadJson = await uploadRes.json().catch(() => ({}));
            if (!uploadRes.ok) {
              // If client upload not allowed (missing auth), fallback to server-side upload
              console.warn('Client-side ImageKit upload failed, falling back to server upload', uploadJson);
            } else if (uploadJson.url) {
              proofImageUrl = uploadJson.url;
            }
          } catch (err) {
            console.warn('Client-side ImageKit upload error, falling back to server upload', err);
            // continue to let server handle the data URI
          }
        }
        // If no publicKey or client upload failed, proofImageUrl remains the data URI and the server will upload it
      }

      const res = await fetch(`/api/leads/${closingLeadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'closed',
          project: closeFormData.project,
          info: closeFormData.info,
          proofImage: proofImageUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to close deal');

      setLeads(leads.map((l) => (l._id === closingLeadId ? data.lead : l)));
      setClosingLeadId(null);
      setCloseFormData({ project: '', info: '', proofImage: '' });
      updateToast(toastId, '✅ Deal closed and sent to admin for approval', 'success');
    } catch (error) {
      updateToast(
        toastId,
        error instanceof Error ? error.message : 'Failed to close deal',
        'error'
      );
    } finally {
      setIsSubmittingClose(false);
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
          <div className="bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
            {/* Mobile cards (visible on small screens) */}
            <div className="block sm:hidden p-4 space-y-4">
              {leads.map((lead) => (
                <div key={lead._id} className="bg-slate-900/40 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-white font-semibold text-lg">{lead.name}</div>
                          <div className="text-slate-400 text-sm">{lead.project || '-'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-slate-300">{lead.source}</div>
                          <div className="mt-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[lead.status]?.bg || 'bg-slate-200'} ${statusColors[lead.status]?.text || 'text-slate-800'}`}>
                              {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-slate-300 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="truncate">{lead.email || '-'}</div>
                          <div className="ml-2 font-semibold">{lead.phone}</div>
                        </div>
                        <p className="mt-2 text-slate-300 text-sm line-clamp-3">{lead.notes || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => {
                        try {
                          const digits = (lead.phone || '').toString().replace(/\D/g, '');
                          const normalized = digits.startsWith('0') ? digits.replace(/^0+/, '') : digits;
                          if (!normalized) return;
                          const url = `https://wa.me/${normalized}`;
                          window.open(url, '_blank');
                        } catch (err) {
                          console.error('Failed to open WhatsApp:', err);
                        }
                      }}
                      className="flex-1 bg-emerald-600/90 text-white py-2 rounded-md text-sm"
                    >
                      WhatsApp
                    </button>
                    <button
                      onClick={() => {
                        if (!lead.phone) {
                          addToast('No phone number available', 'error');
                          return;
                        }
                        setCallConfirmation({
                          isOpen: true,
                          phone: lead.phone,
                          leadName: lead.name,
                        });
                      }}
                      className="flex-1 bg-red-600/90 text-white py-2 rounded-md text-sm flex items-center justify-center gap-2"
                    >
                      <Phone size={16} />
                      Call
                    </button>
                    <button
                      onClick={() => handleEditLead(lead)}
                      className="flex-1 bg-amber-600/90 text-white py-2 rounded-md text-sm"
                    >
                      Edit
                    </button>
                  </div>

                  <div className="mt-3">
                    <label className="text-xs text-slate-400 mb-1 block">Status</label>
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead._id, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg text-sm bg-slate-700 text-white"
                    >
                      <option value="new" disabled={lead.status === 'closed'}>New</option>
                      <option value="connected">Connected</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="closed">Closed</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* Table (hidden on small screens) */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-white">Name</th>
                    <th className="px-6 py-4 text-left font-bold text-white">Project</th>
                    <th className="px-6 py-4 text-left font-bold text-white">Email</th>
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
                      <td className="px-6 py-4 text-slate-300">{lead.project || '-'}</td>
                      <td className="px-6 py-4 text-slate-300">{lead.email || '-'}</td>
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
                          <option value="new" disabled={lead.status === 'closed'}>New</option>
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
                            onClick={() => {
                              try {
                                const digits = (lead.phone || '').toString().replace(/\D/g, '');
                                const normalized = digits.startsWith('0') ? digits.replace(/^0+/, '') : digits;
                                if (!normalized) return;
                                const url = `https://wa.me/${normalized}`;
                                window.open(url, '_blank');
                              } catch (err) {
                                console.error('Failed to open WhatsApp:', err);
                              }
                            }}
                            title="WhatsApp"
                            className="p-2 text-emerald-400 hover:bg-emerald-500 hover:bg-opacity-20 rounded-lg transition"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21.05 2.93a11.07 11.07 0 0 0-15.66 0 11 11 0 0 0 0 15.66L2 22l3.41-1.11A11 11 0 0 0 21.05 2.93z"></path>
                              <path d="M17.5 14.5c-.44-.22-1.3-.65-1.5-.72-.2-.06-.34-.1-.49.22-.16.33-.62.72-.76.87-.14.16-.29.18-.54.06-.25-.12-1- .37-1.9-1.17-.7-.62-1.17-1.38-1.31-1.64-.14-.26-.01-.4.1-.52.1-.1.24-.27.36-.4.12-.14.16-.24.25-.4.08-.16.04-.3-.02-.43-.06-.12-.49-1.18-.67-1.62-.18-.44-.36-.38-.5-.38-.13 0-.28 0-.43 0-.14 0-.36.05-.55.25-.2.2-.76.74-.76 1.8 0 1.06.78 2.08.88 2.22.1.14 1.52 2.34 3.68 3.28 2.2.95 2.2.64 2.6.6.4-.04 1.3-.53 1.49-1.05.19-.52.19-.96.13-1.05-.06-.1-.22-.15-.46-.27z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              if (!lead.phone) {
                                addToast('No phone number available', 'error');
                                return;
                              }
                              setCallConfirmation({
                                isOpen: true,
                                phone: lead.phone,
                                leadName: lead.name,
                              });
                            }}
                            title="Call"
                            className="p-2 text-red-400 hover:bg-red-500 hover:bg-opacity-20 rounded-lg transition"
                          >
                            <Phone size={18} />
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

        {/* Close Lead Modal */}
        {closingLeadId && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-700 flex flex-col max-h-[85vh]">
              <div className="flex justify-between items-center p-4 border-b border-slate-700 bg-gradient-to-r from-slate-900 to-slate-800">
                <h2 className="text-2xl font-bold text-white">Close Deal</h2>
                <button
                  onClick={() => setClosingLeadId(null)}
                  className="text-slate-400 hover:text-white transition p-2"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Project Name *</label>
                  <input
                    type="text"
                    placeholder="Enter project name"
                    value={closeFormData.project}
                    onChange={(e) => setCloseFormData({ ...closeFormData, project: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-700 placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Info *</label>
                  <textarea
                    placeholder="Add info about this deal..."
                    value={closeFormData.info}
                    onChange={(e) => setCloseFormData({ ...closeFormData, info: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-700 placeholder-slate-400"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">Proof Image (URL) *</label>
                  <input
                    type="text"
                    placeholder="Paste image URL as proof of deal"
                    value={closeFormData.proofImage}
                    onChange={(e) => setCloseFormData({ ...closeFormData, proofImage: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-700 placeholder-slate-400"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-slate-700 bg-slate-900 flex gap-3 flex-col sm:flex-row">
                <button
                  onClick={handleSubmitCloseLead}
                  disabled={isSubmittingClose}
                  className="w-full sm:flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition"
                >
                  {isSubmittingClose ? 'Closing...' : 'Close Deal'}
                </button>
                <button
                  onClick={() => setClosingLeadId(null)}
                  className="w-full sm:flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-semibold transition border border-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
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
