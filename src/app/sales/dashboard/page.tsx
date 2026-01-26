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
  status: 'new' | 'connected' | 'negotiation' | 'closed';
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

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update');

      const data = await res.json();
      setLeads(leads.map((l) => (l._id === leadId ? data.lead : l)));
      fetchLeads();
    } catch (error) {
      console.error('Error updating lead:', error);
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Sales Dashboard</h1>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <p className="text-gray-600 text-sm">Total Leads</p>
            <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <p className="text-gray-600 text-sm">Connected</p>
            <p className="text-3xl font-bold text-green-600">{stats.connected}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <p className="text-gray-600 text-sm">Negotiation</p>
            <p className="text-3xl font-bold text-yellow-600">{stats.negotiation}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4 text-center">
            <p className="text-gray-600 text-sm">Closed</p>
            <p className="text-3xl font-bold text-purple-600">{stats.closed}</p>
          </div>
        </div>

        {/* My Leads */}
        <h2 className="text-2xl font-bold text-gray-800 mb-6">My Assigned Leads</h2>

        {loadingLeads ? (
          <div className="flex items-center justify-center py-12">
            <Loader size={32} className="animate-spin text-blue-600" />
          </div>
        ) : leads.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">No leads assigned yet</p>
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
                onStatusChange={(status) => handleStatusChange(lead._id, status)}
                onNotesChange={(notes) => handleNotesChange(lead._id, notes)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
