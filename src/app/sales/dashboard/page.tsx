'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader } from 'lucide-react';
import LeadCard from '@/components/LeadCard';

interface Lead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  property: string;
  status: string;
  notes: string;
  value?: number;
}

export default function SalesDashboard() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    connected: 0,
    negotiation: 0,
    closed: 0,
  });
  const [loadingLeads, setLoadingLeads] = useState(true);

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

  const handleStatusChange = async (leadId: string, newStatus: string, extra?: { proofImage?: string; notes?: string }) => {
    try {
      const body: any = { status: newStatus };
      if (extra?.notes !== undefined) body.notes = extra.notes;
      if (extra?.proofImage !== undefined) body.proofImage = extra.proofImage;

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
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Sales Dashboard</h1>
          <p className="text-slate-400">Track your leads and progress at a glance</p>
        </div>

        {/* Quick Stats */}
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
                property={lead.property}
                status={lead.status}
                notes={lead.notes}
                value={lead.value}
                onStatusChange={(status, extra) => handleStatusChange(lead._id, status, extra)}
                onNotesChange={(notes) => handleNotesChange(lead._id, notes)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
