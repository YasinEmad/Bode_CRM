'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Loader, Eye, Users, Phone, Mail, TrendingUp, AlertCircle, BarChart3, X, ChevronDown, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/Toast';
import SendNoteModal from '@/components/SendNoteModal';

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
  notes?: string;
  createdAt: string | Date;
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
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>('all');
  const [leadSearch, setLeadSearch] = useState<string>('');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedMemberForNote, setSelectedMemberForNote] = useState<{ id: string; name: string } | null>(null);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [editingLeadForNotes, setEditingLeadForNotes] = useState<Lead | null>(null);
  const [editingNotesText, setEditingNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [newAssigneeId, setNewAssigneeId] = useState<string>('');

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
      const filteredMembers = (data.members || []).filter((m: TeamMember) => m.id !== (user as any)?._id);
      setMembers(filteredMembers);
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
      setLeadStatusFilter('all');
      setDateFromFilter('');
      setDateToFilter('');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to load leads', 'error');
    }
  };

  const handleOpenNoteModal = (memberId: string, memberName: string) => {
    setSelectedMemberForNote({ id: memberId, name: memberName });
    setShowNoteModal(true);
  };

  const filterLeads = (leads: Lead[]): Lead[] => {
    return leads.filter((lead: Lead) => {
      // Status filter
      if (leadStatusFilter !== 'all' && lead.status !== leadStatusFilter) {
        return false;
      }

      // Date range filter
      if (dateFromFilter || dateToFilter) {
        const leadDate = new Date(lead.createdAt);
        if (dateFromFilter) {
          const fromDate = new Date(dateFromFilter);
          if (leadDate < fromDate) return false;
        }
        if (dateToFilter) {
          const toDate = new Date(dateToFilter);
          toDate.setHours(23, 59, 59, 999); // Include entire day
          if (leadDate > toDate) return false;
        }
      }

      // Text search filter (name, phone, email, notes)
      if (leadSearch.trim()) {
        const query = leadSearch.trim().toLowerCase();
        const haystack = `${lead.name || ''} ${lead.phone || ''} ${lead.email || ''} ${lead.notes || ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return true;
    });
  };

  const handleAssignLead = async (leadId: string, newMemberId: string | null) => {
    try {
      const res = await fetch('/api/leads/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ leadId, employeeId: newMemberId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to assign lead');
      }
      const data = await res.json();
      // Update the lead in selectedLeads
      if (selectedLeads) {
        const updated = selectedLeads.map((l) =>
          l._id === leadId
            ? {
                ...l,
                assignedTo: newMemberId
                  ? {
                      _id: newMemberId,
                      name:
                        newMemberId === user?.id
                          ? user?.name || 'Unknown'
                          : members.find((m) => m.id === newMemberId)?.name || 'Unknown',
                    }
                  : undefined,
              }
            : l
        );
        setSelectedLeads(updated);
      }
      setEditingLeadId(null);
      setNewAssigneeId('');
      addToast('Lead assigned successfully!', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to assign lead', 'error');
    }
  };

  const openEditNotesModal = (lead: Lead) => {
    setEditingLeadForNotes(lead);
    setEditingNotesText(lead.notes || '');
  };

  const closeEditNotesModal = () => {
    setEditingLeadForNotes(null);
    setEditingNotesText('');
  };

  const saveLeadNotes = async () => {
    if (!editingLeadForNotes) return;
    try {
      setSavingNotes(true);
      const res = await fetch(`/api/leads/${editingLeadForNotes._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: editingNotesText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save notes');
      setSelectedLeads((prev) =>
        prev
          ? prev.map((lead) =>
              lead._id === editingLeadForNotes._id ? { ...lead, notes: editingNotesText } : lead
            )
          : prev
      );
      addToast('Notes updated successfully', 'success');
      closeEditNotesModal();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to save notes', 'error');
    } finally {
      setSavingNotes(false);
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
              {members.map((member) => (
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
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenNoteModal(member.id, member.name)} 
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 font-semibold text-sm"
                    >
                      <MessageSquare size={16} /> Send Message
                    </button>
                    <button 
                      onClick={() => viewLeadsFor(member.id, member.name)} 
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 font-semibold text-sm group/btn"
                    >
                      <Eye size={16} /> View Leads
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile/Tablet View - List */}
            <div className="lg:hidden space-y-3">
              {members.map((member) => (
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

                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenNoteModal(member.id, member.name)} 
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 font-semibold text-sm"
                    >
                      <MessageSquare size={16} /> Send Message
                    </button>
                    <button 
                      onClick={() => viewLeadsFor(member.id, member.name)} 
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-all duration-200 font-semibold text-sm"
                    >
                      <Eye size={16} /> View Leads
                    </button>
                  </div>
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
          <div className="px-4 sm:px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/80 to-slate-900/80">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-lg sm:text-xl flex items-center gap-2">
                <Eye size={22} className="text-cyan-400" />
                <span className="truncate">
                  {leadsFilter === 'all' 
                    ? `All Team Leads (${filterLeads(selectedLeads).length})` 
                    : `${selectedMemberName}'s Leads (${filterLeads(selectedLeads).length})`
                  }
                </span>
              </h3>
              <button 
                onClick={() => {
                  setSelectedLeads(null);
                  setLeadStatusFilter('all');
                  setDateFromFilter('');
                  setDateToFilter('');
                }} 
                className="text-slate-400 hover:text-red-400 transition-colors p-1 hover:bg-red-400/10 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Search + Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-end">
              <div className="col-span-1 md:col-span-2">
                <label className="text-sm font-medium text-slate-300 block mb-2">Search Leads</label>
                <div className="relative">
                  <input
                    type="text"
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    placeholder="Search by name, phone, email, notes..."
                    className="w-full pr-10 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setLeadSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-100"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Status</label>
                <select
                  value={leadStatusFilter}
                  onChange={(e) => setLeadStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                >
                  <option value="all">All Statuses</option>
                  <option value="new">✨ New</option>
                  <option value="connected">✓ Connected</option>
                  <option value="negotiation">💬 Negotiation</option>
                  <option value="pending_closed">⏳ Pending</option>
                  <option value="closed_pending_approval">⏼ Pending Approval</option>
                  <option value="closed">🎉 Closed</option>
                  <option value="low_budget">💰 Low Budget</option>
                  <option value="no_answer">📞 No Answer</option>
                  <option value="switched_off">🔴 Switched Off</option>
                  <option value="lost">❌ Lost</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-300 block mb-2">Date Range</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateFromFilter}
                    onChange={(e) => setDateFromFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={dateToFilter}
                    onChange={(e) => setDateToFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div className="flex justify-end md:justify-start">
                <button
                  onClick={() => {
                    setLeadStatusFilter('all');
                    setDateFromFilter('');
                    setDateToFilter('');
                    setLeadSearch('');
                  }}
                  className="mt-6 bg-slate-700/70 hover:bg-slate-600 text-slate-100 px-3 py-2 rounded-lg text-xs font-semibold transition"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
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
              filterLeads(selectedLeads)
                .map((lead: Lead, idx: number) => {
                const statusColors: Record<string, {bg: string, text: string, label: string}> = {
                  'new': {bg: 'bg-blue-500/20', text: 'text-blue-300', label: 'New'},
                  'connected': {bg: 'bg-purple-500/20', text: 'text-purple-300', label: 'Connected'},
                  'negotiation': {bg: 'bg-orange-500/20', text: 'text-orange-300', label: 'Negotiation'},
                  'pending_closed': {bg: 'bg-yellow-500/20', text: 'text-yellow-300', label: 'Pending'},
                  'closed_pending_approval': {bg: 'bg-cyan-500/20', text: 'text-cyan-300', label: 'Pending Approval'},
                  'closed': {bg: 'bg-emerald-500/20', text: 'text-emerald-300', label: 'Closed'},
                  'low_budget': {bg: 'bg-gray-500/20', text: 'text-gray-300', label: 'Low Budget'},
                  'no_answer': {bg: 'bg-orange-600/20', text: 'text-orange-200', label: 'No Answer'},
                  'switched_off': {bg: 'bg-red-600/20', text: 'text-red-200', label: 'Switched Off'},
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
                              {lead.notes && (
                                <div className="mt-2 text-xs text-slate-300">
                                  <span className="font-semibold text-slate-400">Notes:</span> {lead.notes}
                                </div>
                              )}
                              <div className="mt-2 text-xs text-slate-500">
                                Created: {new Date(lead.createdAt).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 flex flex-col gap-2 items-end">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border ${statusInfo.bg} ${statusInfo.text} border-opacity-30`}>
                          {statusInfo.label}
                        </span>
                        
                        {/* Assignment Editor - Show for both 'all' and 'member' filters */}
                        {editingLeadId === lead._id ? (
                          <div className="flex gap-2 items-center">
                            <select
                              value={newAssigneeId}
                              onChange={(e) => setNewAssigneeId(e.target.value)}
                              className="px-2 py-1 bg-slate-700 border border-slate-600 rounded-lg text-white text-xs"
                            >
                              <option value="">Unassign</option>
                              <option value={user?.id}>{user?.name} (You)</option>
                              {members.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleAssignLead(lead._id, newAssigneeId || null)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => {
                                setEditingLeadId(null);
                                setNewAssigneeId('');
                              }}
                              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 flex flex-col sm:flex-row gap-2 items-end">
                            <div>
                              Assigned to:{' '}
                              <span className="text-slate-300 font-medium">
                                {lead.assignedTo?.name || 'Unassigned'}
                              </span>
                            </div>
                            <div className="flex gap-1 items-center flex-wrap">
                              {lead.status !== 'closed' && (
                                <>
                                  <button
                                    onClick={() => handleAssignLead(lead._id, user?.id || null)}
                                    className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold transition-colors whitespace-nowrap"
                                  >
                                    Assign to Me
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingLeadId(lead._id);
                                      setNewAssigneeId(lead.assignedTo?._id || '');
                                    }}
                                    className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold transition-colors"
                                  >
                                    Edit
                                  </button>
                                </>
                              )}
                              {lead.status === 'closed' && (
                                <div className="px-2 py-1 bg-slate-700/50 text-slate-400 rounded text-xs font-semibold">
                                  Closed • Locked
                                </div>
                              )}
                              <button
                                onClick={() => openEditNotesModal(lead)}
                                className="px-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs font-semibold transition-colors"
                              >
                                Edit Notes
                              </button>
                            </div>
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

      {/* Edit Lead Notes Modal */}
      {editingLeadForNotes && token && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Edit Notes</h2>
                <p className="text-sm text-slate-400">Lead: {editingLeadForNotes.name}</p>
              </div>
              <button
                onClick={closeEditNotesModal}
                disabled={savingNotes}
                className="text-slate-400 hover:text-white hover:bg-slate-700/50 p-2 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>
            <textarea
              value={editingNotesText}
              onChange={(e) => setEditingNotesText(e.target.value)}
              rows={5}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Edit notes for this lead..."
              disabled={savingNotes}
            />
            <div className="mt-2 text-xs text-slate-400 flex justify-end">
              {editingNotesText.length} / 2000 characters
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={closeEditNotesModal}
                disabled={savingNotes}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveLeadNotes}
                disabled={savingNotes}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50"
              >
                {savingNotes ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Note Modal */}
      {selectedMemberForNote && token && (
        <SendNoteModal
          isOpen={showNoteModal}
          onClose={() => {
            setShowNoteModal(false);
            setSelectedMemberForNote(null);
          }}
          receiverId={selectedMemberForNote.id}
          receiverName={selectedMemberForNote.name}
          token={token}
          onSuccess={() => {
            addToast('Note sent successfully!', 'success');
          }}
        />
      )}
    </div>
  );
}
