'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Loader, Eye, Users } from 'lucide-react';
import { useToast } from '@/components/Toast';

export default function MyTeamPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [team, setTeam] = useState<any | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<any[] | null>(null);

  useEffect(() => {
    if (!loading && (!user)) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => { if (!loading && user) fetchMyTeam(); }, [user, loading]);

  const fetchMyTeam = async () => {
    setLoadingData(true);
    try {
      const res = await fetch('/api/teams/my', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setTeam(data.team);
      setMembers(data.members || []);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to load team', 'error');
    } finally { setLoadingData(false); }
  };

  const viewLeadsFor = async (userId: string) => {
    try {
      const res = await fetch(`/api/leads?userId=${userId}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSelectedLeads(data.leads || []);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to load leads', 'error');
    }
  };

  const viewAllTeamLeads = async () => {
    try {
      const res = await fetch('/api/teams/my/leads', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSelectedLeads(data.leads || []);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to load leads', 'error');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-10 w-10 border-b-2 border-blue-500 rounded-full"></div></div>;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">My Team</h1>
        <div className="flex gap-3">
          <button onClick={viewAllTeamLeads} className="bg-cyan-600 text-white px-4 py-2 rounded flex items-center gap-2"><Users /> View All Team Leads</button>
        </div>
      </div>

      {loadingData ? <div className="py-8 text-center"><Loader className="animate-spin" /></div> : (
        <div className="bg-white/5 p-4 rounded">
          <h2 className="text-xl font-semibold mb-4">Team: {team?.name || '—'}</h2>
          <table className="w-full text-left">
            <thead>
              <tr>
                <th>Name</th>
                <th>Position</th>
                <th className="text-center">Leads</th>
                <th className="text-center">Conversion %</th>
                <th className="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} className="border-t border-white/10">
                  <td className="py-3 font-semibold">{m.name}</td>
                  <td>{m.position || '—'}</td>
                  <td className="text-center">{m.leadsCount}</td>
                  <td className="text-center">{m.conversionRate ? m.conversionRate.toFixed(1) : '0.0'}</td>
                  <td className="text-center"><button onClick={() => viewLeadsFor(m.id)} className="px-3 py-1 bg-emerald-600 rounded text-white flex items-center gap-2"><Eye /> View Leads</button></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Leads modal / panel */}
          {selectedLeads && (
            <div className="mt-6 bg-slate-900 p-4 rounded">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Leads ({selectedLeads.length})</h3>
                <button onClick={() => setSelectedLeads(null)} className="text-slate-400">Close</button>
              </div>

              <div className="max-h-72 overflow-y-auto">
                {selectedLeads.map((lead: any) => (
                  <div key={lead._id} className="p-3 border-b border-white/5">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{lead.name}</div>
                        <div className="text-sm text-slate-400">{lead.phone} • {lead.email || '—'}</div>
                      </div>
                      <div className="text-sm text-slate-300">Status: <span className="font-semibold">{lead.status}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
