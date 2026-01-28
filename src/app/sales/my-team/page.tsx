'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Loader, Eye, Users, ChevronRight, Phone, Mail, TrendingUp, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/Toast';

interface TeamMember {
  id: string;
  name: string;
  position: string;
  username: string;
  leadsCount: number;
  closedCount: number;
  conversionRate: number;
}

interface Lead {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  status: string;
  assignedTo?: {
    name: string;
    _id: string;
  };
}

export default function MyTeamPage() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [team, setTeam] = useState<any | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedLeads, setSelectedLeads] = useState<Lead[] | null>(null);
  const [selectedMemberName, setSelectedMemberName] = useState<string>('');
  const [leadsFilter, setLeadsFilter] = useState<'all' | 'member'>('all');

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => { 
    if (!loading && user && token) fetchMyTeam(); 
  }, [user, loading, token]);

  const fetchMyTeam = async () => {
    setLoadingData(true);
    try {
      const res = await fetch('/api/teams/my', { 
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load team');
      setTeam(data.team);
      setMembers(data.members || []);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to load team', 'error');
    } finally { setLoadingData(false); }
  };

  const viewLeadsFor = async (memberId: string, memberName: string) => {
    try {
      const res = await fetch(`/api/leads?userId=${memberId}`, { 
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load leads');
      setSelectedLeads(data.leads || []);
      setSelectedMemberName(memberName);
      setLeadsFilter('member');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to load leads', 'error');
    }
  };

  const viewAllTeamLeads = async () => {
    try {
      const res = await fetch('/api/teams/my/leads', { 
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load leads');
      setSelectedLeads(data.leads || []);
      setLeadsFilter('all');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to load leads', 'error');
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader className="animate-spin h-10 w-10 text-indigo-400" />
        <p className="text-slate-400">Loading team data...</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/5 border border-white/10 rounded-lg p-8 max-w-md text-center">
          <AlertCircle size={32} className="mx-auto mb-4 text-amber-400" />
          <h2 className="text-xl font-bold mb-2">Team Not Found</h2>
          <p className="text-slate-400">You are not a team leader or your team has not been set up yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="text-indigo-500" />
            My Team
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Team: <span className="font-semibold text-slate-300">{team?.name || '—'}</span>
          </p>
        </div>
        <button 
          onClick={viewAllTeamLeads} 
          className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors"
        >
          <Users size={18} /> View All Team Leads
        </button>
      </div>

      {/* Team Members Section */}
      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-cyan-400" />
          Team Members ({members.length})
        </h2>

        {members.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <AlertCircle size={32} className="mx-auto mb-3 text-amber-400" />
            <p>No team members yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 font-semibold text-slate-300">Name</th>
                  <th className="px-4 py-3 font-semibold text-slate-300">Position</th>
                  <th className="px-4 py-3 font-semibold text-slate-300 text-center">Leads Count</th>
                  <th className="px-4 py-3 font-semibold text-slate-300 text-center">Closed Leads</th>
                  <th className="px-4 py-3 font-semibold text-slate-300 text-center">Conversion Rate</th>
                  <th className="px-4 py-3 font-semibold text-slate-300 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, idx) => (
                  <tr 
                    key={m.id} 
                    className={`border-t border-white/5 hover:bg-white/5 transition-colors ${idx % 2 === 0 ? 'bg-white/2' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-200">{m.name}</div>
                      <div className="text-sm text-slate-400">{m.username}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">
                        {m.position || 'No position'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-sm font-medium">
                        {m.leadsCount}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-sm font-medium">
                        {m.closedCount}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <TrendingUp size={16} className={m.conversionRate > 0 ? 'text-green-400' : 'text-slate-400'} />
                        <span className={`font-bold text-lg ${m.conversionRate > 0 ? 'text-green-400' : 'text-slate-400'}`}>
                          {m.conversionRate.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button 
                        onClick={() => viewLeadsFor(m.id, m.name)} 
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-white text-sm font-medium flex items-center gap-2 mx-auto transition-colors"
                      >
                        <Eye size={16} /> View Leads
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Leads Display Section */}
      {selectedLeads && (
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-slate-900/50">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Eye size={20} className="text-cyan-400" />
              {leadsFilter === 'all' 
                ? `All Team Leads (${selectedLeads.length})` 
                : `${selectedMemberName}'s Leads (${selectedLeads.length})`
              }
            </h3>
            <button 
              onClick={() => setSelectedLeads(null)} 
              className="text-slate-400 hover:text-slate-200 transition-colors font-bold text-lg"
            >
              ✕
            </button>
          </div>

          {/* Leads List */}
          <div className="max-h-96 overflow-y-auto">
            {selectedLeads.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                <AlertCircle size={32} className="mx-auto mb-3 text-amber-400" />
                <p>No leads found</p>
              </div>
            ) : (
              selectedLeads.map((lead: Lead, idx: number) => {
                const statusColors: Record<string, string> = {
                  'new': 'bg-blue-500/20 text-blue-300',
                  'connected': 'bg-purple-500/20 text-purple-300',
                  'negotiation': 'bg-orange-500/20 text-orange-300',
                  'pending_closed': 'bg-yellow-500/20 text-yellow-300',
                  'closed_pending_approval': 'bg-cyan-500/20 text-cyan-300',
                  'closed': 'bg-emerald-500/20 text-emerald-300',
                  'lost': 'bg-red-500/20 text-red-300',
                };
                
                return (
                  <div 
                    key={lead._id} 
                    className={`px-6 py-4 border-b border-white/5 hover:bg-white/5 transition-colors ${idx % 2 === 0 ? 'bg-white/2' : ''}`}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="font-semibold text-slate-200 mb-1">{lead.name}</div>
                        <div className="flex gap-4 text-sm text-slate-400">
                          {lead.phone && (
                            <div className="flex items-center gap-1">
                              <Phone size={14} />
                              {lead.phone}
                            </div>
                          )}
                          {lead.email && (
                            <div className="flex items-center gap-1">
                              <Mail size={14} />
                              {lead.email}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[lead.status] || 'bg-slate-500/20 text-slate-300'}`}>
                          {lead.status.replace('_', ' ')}
                        </span>
                        {leadsFilter === 'all' && lead.assignedTo && (
                          <div className="text-xs text-slate-400 mt-1">
                            Assigned to: {lead.assignedTo.name}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}    </div>
  );
}