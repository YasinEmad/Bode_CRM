'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Loader, Eye, Users, Phone, Mail, TrendingUp, AlertCircle, BarChart3, X, ChevronDown } from 'lucide-react';
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
  const [sortBy, setSortBy] = useState<'name' | 'leads' | 'closed' | 'conversion'>('leads');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
      // Filter to ensure team leader is not included
      const filteredMembers = (data.members || []).filter((m: TeamMember) => m.id !== user?._id);
      setMembers(filteredMembers);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to load team', 'error');
    } finally { setLoadingData(false); }
  };

  const getSortedMembers = () => {
    const sorted = [...members].sort((a, b) => {
      let aVal: any = a[sortBy as keyof TeamMember];
      let bVal: any = b[sortBy as keyof TeamMember];
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
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
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 pt-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-lg p-2">
              <Users className="text-white w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            My Team
          </h1>
          <p className="text-slate-400 mt-2">
            Team: <span className="font-semibold text-indigo-400">{team?.name || '—'}</span>
            <span className="text-slate-500 ml-2">({members.length} members)</span>
          </p>
        </div>
        <button 
          onClick={viewAllTeamLeads} 
          className="w-full sm:w-auto bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white px-5 py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-blue-500/30 font-semibold text-sm sm:text-base"
        >
          <BarChart3 size={20} /> View All Team Leads
        </button>
      </div>

      {/* Team Members Section */}
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-xl p-4 sm:p-6 mb-6 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <TrendingUp size={24} className="text-cyan-400" />
            Team Performance
          </h2>
          
          {/* Sorting Controls */}
          {members.length > 0 && (
            <div className="w-full sm:w-auto flex gap-2 text-xs sm:text-sm">
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 bg-slate-700/60 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="name">Sort by Name</option>
                <option value="leads">Sort by Leads</option>
                <option value="closed">Sort by Closed</option>
                <option value="conversion">Sort by Conversion</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 bg-slate-700/60 border border-slate-600 rounded-lg text-slate-200 hover:bg-slate-600/60 transition-colors flex items-center gap-1"
              >
                <ChevronDown size={16} className={`transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {members.length === 0 ? (
          <div className="py-12 sm:py-16 text-center">
            <div className="bg-slate-700/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} className="text-amber-400" />
            </div>
            <p className="text-slate-400 font-medium">No team members yet</p>
          </div>
        ) : (
          <>
            {/* Desktop View - Grid */}
            <div className="hidden lg:grid grid-cols-2 xl:grid-cols-3 gap-5">
              {getSortedMembers().map((member) => (
                <div 
                  key={member.id} 
                  className="group relative bg-gradient-to-br from-slate-700/40 to-slate-800/40 border border-slate-600/50 hover:border-cyan-500/50 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20 hover:bg-slate-700/60"
                >
                  {/* Top Accent Bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  {/* Member Header */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-slate-100 group-hover:text-white transition-colors line-clamp-1">
                          {member.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">@{member.username}</p>
                      </div>
                    </div>
                    <span className="inline-block px-3 py-1 bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 text-indigo-300 rounded-full text-xs font-semibold border border-indigo-400/30">
                      {member.position || 'Team Member'}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    {/* Leads */}
                    <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-3 text-center hover:border-cyan-400/50 transition-colors">
                      <p className="text-xs text-cyan-400/70 font-semibold mb-1.5">LEADS</p>
                      <p className="text-2xl font-bold text-cyan-300">{member.leadsCount}</p>
                    </div>

                    {/* Closed */}
                    <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-lg p-3 text-center hover:border-emerald-400/50 transition-colors">
                      <p className="text-xs text-emerald-400/70 font-semibold mb-1.5">CLOSED</p>
                      <p className="text-2xl font-bold text-emerald-300">{member.closedCount}</p>
                    </div>

                    {/* Conversion */}
                    <div className={`bg-gradient-to-br ${
                      member.conversionRate > 0 
                        ? 'from-green-500/10 to-emerald-500/10 border-green-500/30' 
                        : 'from-slate-500/10 to-slate-600/10 border-slate-500/30'
                    } border rounded-lg p-3 text-center hover:border-opacity-70 transition-colors`}>
                      <p className={`text-xs font-semibold mb-1.5 ${
                        member.conversionRate > 0 
                          ? 'text-green-400/70' 
                          : 'text-slate-400/70'
                      }`}>
                        RATE
                      </p>
                      <p className={`text-2xl font-bold ${
                        member.conversionRate > 0 
                          ? 'text-green-400' 
                          : 'text-slate-400'
                      }`}>
                        {member.conversionRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button 
                    onClick={() => viewLeadsFor(member.id, member.name)} 
                    className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 font-semibold text-sm group/btn"
                  >
                    <Eye size={16} /> View Leads
                  </button>
                </div>
              ))}
            </div>

            {/* Mobile/Tablet View - List */}
            <div className="lg:hidden space-y-3">
              {getSortedMembers().map((member) => (
                <div 
                  key={member.id} 
                  className="bg-gradient-to-br from-slate-700/40 to-slate-800/40 border border-slate-600/50 hover:border-cyan-500/50 rounded-lg p-4 transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-100 truncate">
                        {member.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">@{member.username}</p>
                    </div>
                    <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-semibold whitespace-nowrap">
                      {member.position || 'Member'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-cyan-500/10 border border-cyan-500/20 rounded p-2 text-center">
                      <p className="text-xs text-cyan-400 font-semibold mb-0.5">Leads</p>
                      <p className="text-lg font-bold text-cyan-300">{member.leadsCount}</p>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-2 text-center">
                      <p className="text-xs text-emerald-400 font-semibold mb-0.5">Closed</p>
                      <p className="text-lg font-bold text-emerald-300">{member.closedCount}</p>
                    </div>
                    <div className={`${
                      member.conversionRate > 0 
                        ? 'bg-green-500/10 border-green-500/20' 
                        : 'bg-slate-500/10 border-slate-500/20'
                    } border rounded p-2 text-center`}>
                      <p className={`text-xs font-semibold mb-0.5 ${
                        member.conversionRate > 0 
                          ? 'text-green-400' 
                          : 'text-slate-400'
                      }`}>
                        Rate
                      </p>
                      <p className={`text-lg font-bold ${
                        member.conversionRate > 0 
                          ? 'text-green-400' 
                          : 'text-slate-400'
                      }`}>
                        {member.conversionRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => viewLeadsFor(member.id, member.name)} 
                    className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 font-semibold text-sm"
                  >
                    <Eye size={16} /> View Leads
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Leads Display Section */}
      {selectedLeads && (
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-xl overflow-hidden backdrop-blur-sm animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex justify-between items-center px-4 sm:px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/80 to-slate-900/80">
            <h3 className="font-bold text-lg sm:text-xl flex items-center gap-2">
              <Eye size={22} className="text-cyan-400" />
              <span className="truncate">
                {leadsFilter === 'all' 
                  ? `All Team Leads (${selectedLeads.length})` 
                  : `${selectedMemberName}'s Leads (${selectedLeads.length})`
                }
              </span>
            </h3>
            <button 
              onClick={() => setSelectedLeads(null)} 
              className="text-slate-400 hover:text-red-400 transition-colors p-1 hover:bg-red-400/10 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>

          {/* Leads List */}
          <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-700/30">
            {selectedLeads.length === 0 ? (
              <div className="p-8 text-center">
                <div className="bg-slate-700/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle size={32} className="text-amber-400" />
                </div>
                <p className="text-slate-400 font-medium">No leads found</p>
              </div>
            ) : (
              selectedLeads.map((lead: Lead, idx: number) => {
                const statusColors: Record<string, {bg: string, text: string, label: string}> = {
                  'new': {bg: 'bg-blue-500/20', text: 'text-blue-300', label: 'New'},
                  'connected': {bg: 'bg-purple-500/20', text: 'text-purple-300', label: 'Connected'},
                  'negotiation': {bg: 'bg-orange-500/20', text: 'text-orange-300', label: 'Negotiation'},
                  'pending_closed': {bg: 'bg-yellow-500/20', text: 'text-yellow-300', label: 'Pending'},
                  'closed_pending_approval': {bg: 'bg-cyan-500/20', text: 'text-cyan-300', label: 'Pending Approval'},
                  'closed': {bg: 'bg-emerald-500/20', text: 'text-emerald-300', label: 'Closed'},
                  'lost': {bg: 'bg-red-500/20', text: 'text-red-300', label: 'Lost'},
                };
                
                const statusInfo = statusColors[lead.status] || {bg: 'bg-slate-500/20', text: 'text-slate-300', label: lead.status};
                
                return (
                  <div 
                    key={lead._id} 
                    className="px-4 sm:px-6 py-4 hover:bg-slate-700/30 transition-colors duration-200"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-slate-100 text-base break-words">
                              {lead.name}
                            </h4>
                            <div className="flex flex-col gap-2 text-xs sm:text-sm text-slate-400 mt-2">
                              {lead.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone size={14} className="flex-shrink-0 text-cyan-400" />
                                  <span className="break-all">{lead.phone}</span>
                                </div>
                              )}
                              {lead.email && (
                                <div className="flex items-center gap-2">
                                  <Mail size={14} className="flex-shrink-0 text-cyan-400" />
                                  <span className="break-all">{lead.email}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border ${statusInfo.bg} ${statusInfo.text} border-opacity-30`}>
                          {statusInfo.label}
                        </span>
                        {leadsFilter === 'all' && lead.assignedTo && (
                          <div className="text-xs text-slate-400 mt-2 text-right">
                            Assigned to: <span className="text-slate-300 font-medium">{lead.assignedTo.name}</span>
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
      )}
    </div>
  );
}
