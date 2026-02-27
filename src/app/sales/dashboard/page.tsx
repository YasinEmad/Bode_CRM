'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader, Plus, X } from 'lucide-react';
import { useToast } from '@/components/Toast';
import LeadCard from '@/components/LeadCard';
import MarkAttendanceCard from '@/components/MarkAttendanceCard';

interface Lead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  property: string;
  project?: string;
  status: string;
  notes: string;
  value?: number;
}

interface Employee {
  _id: string;
  name: string;
}

export default function SalesDashboard() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<Employee[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    connected: 0,
    negotiation: 0,
    closed: 0,
  });
  const [loadingLeads, setLoadingLeads] = useState(true);
  const { addToast, updateToast } = useToast();
  const [isCreatingLead, setIsCreatingLead] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newLeadData, setNewLeadData] = useState({
    name: '',
    phone: '',
    email: '',
    project: '',
    source: 'other',
    sourceText: '',
    notes: '',
  });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'sales')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (token && user) {
      fetchLeads();
      // attempt to fetch team members (will succeed only for team leaders)
      (async () => {
        try {
          const res = await fetch('/api/teams/my-members', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) return;
          const data = await res.json();
          setTeamMembers(Array.isArray(data.members) ? data.members : []);
        } catch (err) {
          // ignore
        }
      })();
    }
  }, [token, user]);

  const fetchLeads = async () => {
    try {
      const res = await fetch(`/api/leads?userId=${user?.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const userLeads = Array.isArray(data.leads) ? data.leads : [];

      setLeads(userLeads);
      setStats({
        total: userLeads.length,
        connected: userLeads.filter((l: Lead) => l.status === 'connected').length,
        negotiation: userLeads.filter((l: Lead) => l.status === 'negotiation').length,
        closed: userLeads.filter((l: Lead) => l.status === 'closed').length,
      });
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoadingLeads(false);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string, extra?: { proofImage?: string; info?: string; notes?: string; project?: string }) => {
    try {
      const body: any = { status: newStatus };
      if (extra?.notes !== undefined) body.notes = extra.notes;

      // If proofImage is a data URI, upload it client-side to ImageKit
      let proofImageToSend = extra?.proofImage;
      if (typeof proofImageToSend === 'string' && proofImageToSend.startsWith('data:')) {
        const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
        if (publicKey) {
          try {
            const fileName = `proof_${Date.now()}.png`;
            const form = new FormData();
            form.append('file', proofImageToSend);
            form.append('fileName', fileName);
            form.append('publicKey', publicKey);
            form.append('useUniqueFileName', 'true');

            const uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
              method: 'POST',
              body: form,
            });

            const uploadJson = await uploadRes.json().catch(() => ({}));
            if (!uploadRes.ok) {
              console.warn('Client-side ImageKit upload failed, falling back to server upload', uploadJson);
            } else if (uploadJson.url) {
              proofImageToSend = uploadJson.url;
            }
          } catch (err) {
            console.warn('Client-side ImageKit upload error, falling back to server upload', err);
          }
        }
        // If no publicKey or client upload failed, proofImageToSend remains the data URI and the server will upload it
      }

      if (proofImageToSend !== undefined) body.proofImage = proofImageToSend;
      if (extra?.info !== undefined) body.info = extra.info;
      if (extra?.project !== undefined) body.project = extra.project;

      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update');
      }

      const data = await res.json();
      setLeads(leads.map((l) => (l._id === leadId ? data.lead : l)));
      fetchLeads();
    } catch (error) {
      console.error('Error updating lead:', error instanceof Error ? error.message : error);
    }
  };

  const handleNotesChange = async (leadId: string, notes: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes }),
      });

      if (!res.ok) throw new Error('Failed to update');

      const data = await res.json();
      setLeads(leads.map((l) => (l._id === leadId ? data.lead : l)));
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const handleCreateLead = async () => {
    if (!newLeadData.name || !newLeadData.phone) {
      addToast('Please fill in name and phone', 'error');
      return;
    }

    if (newLeadData.source === 'other' && (!newLeadData.sourceText || newLeadData.sourceText.trim() === '')) {
      addToast('Please provide a custom source when Source is Other', 'error');
      return;
    }

    setIsSubmitting(true);
    const toastId = addToast('Creating lead...', 'loading');

    try {
      const payload = {
        name: newLeadData.name,
        phone: newLeadData.phone,
        email: newLeadData.email || '',
        project: newLeadData.project || '',
        source: newLeadData.source || 'other',
        sourceText: newLeadData.source === 'other' ? (newLeadData.sourceText || '') : (newLeadData.sourceText || ''),
        notes: newLeadData.notes || '',
      };

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create lead');

      addToast('✅ Lead created and assigned to you!', 'success');
      setNewLeadData({ name: '', phone: '', email: '', project: '', source: 'other', sourceText: '', notes: '' });
      setIsCreatingLead(false);
      // refresh leads
      fetchLeads();
      updateToast(toastId, '✅ Lead created', 'success');
    } catch (error) {
      updateToast(toastId, error instanceof Error ? error.message : 'Failed to create lead', 'error');
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
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Sales Dashboard</h1>
              <p className="text-slate-400">Track your leads and progress at a glance</p>
            </div>
            <button
              onClick={() => setIsCreatingLead(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2 whitespace-nowrap"
            >
              <Plus size={20} /> Add New Lead
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mb-8">
          <MarkAttendanceCard />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl p-6 text-white hover:shadow-2xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Leads</p>
                <p className="text-4xl font-bold mt-2">{stats.total}</p>
              </div>
              <div className="text-5xl opacity-20">📋</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl shadow-xl p-6 text-white hover:shadow-2xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Connected</p>
                <p className="text-4xl font-bold mt-2">{stats.connected}</p>
              </div>
              <div className="text-5xl opacity-20">✓</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl shadow-xl p-6 text-white hover:shadow-2xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Negotiation</p>
                <p className="text-4xl font-bold mt-2">{stats.negotiation}</p>
              </div>
              <div className="text-5xl opacity-20">💬</div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl shadow-xl p-6 text-white hover:shadow-2xl transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Closed</p>
                <p className="text-4xl font-bold mt-2">{stats.closed}</p>
              </div>
              <div className="text-5xl opacity-20">🎉</div>
            </div>
          </div>
        </div>

        {/* My Leads */}
        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">My Assigned Leads</h2>
          <p className="text-slate-400">Manage and progress your leads</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leads.map((lead) => (
              <LeadCard
                key={lead._id}
                id={lead._id}
                name={lead.name}
                email={lead.email}
                phone={lead.phone}
                property={(lead as any).displaySource || ((lead as any).sourceText && (lead as any).sourceText.trim().length > 0 ? (lead as any).sourceText : ((lead as any).source || lead.property))}
                project={lead.project}
                status={lead.status}
                notes={lead.notes}
                value={lead.value}
                // if user is a team leader, pass assignable members and assign handler
                assignableMembers={teamMembers}
                onAssign={async (employeeId: string | null) => {
                  try {
                    const res = await fetch('/api/leads/assign', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ leadId: lead._id, employeeId }),
                    });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      throw new Error(err.error || 'Failed to assign');
                    }
                    const data = await res.json();
                    const updated = {
                      ...data.lead,
                      displaySource: data.lead?.sourceText && String(data.lead.sourceText).trim().length > 0 ? data.lead.sourceText : data.lead.source,
                    };
                    setLeads((prev) => prev.map((l) => (l._id === lead._id ? updated : l)));
                    // Refresh leads after assignment to ensure assigned members can see their new leads
                    setTimeout(() => fetchLeads(), 500);
                  } catch (err) {
                    console.error('Assign error:', err);
                  }
                }}
                onStatusChange={(status, extra) => handleStatusChange(lead._id, status, extra)}
                onNotesChange={(notes) => handleNotesChange(lead._id, notes)}
              />
            ))}
          </div>
        )}

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
                <div className="mt-3">
                  <label className="block text-sm font-semibold text-white mb-2">Specify Source (optional)</label>
                  <input
                    type="text"
                    placeholder="Enter custom source"
                    value={newLeadData.sourceText}
                    onChange={(e) => setNewLeadData({ ...newLeadData, sourceText: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-700 placeholder-slate-400"
                  />
                </div>
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
      </div>
    </div>
  );
}
