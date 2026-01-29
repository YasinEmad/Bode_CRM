'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Loader, Edit2, Trash2, PlusCircle, Users, User, CheckCircle, AlertCircle, Search, X, ArrowRight, UserPlus } from 'lucide-react';
import { useToast } from '@/components/Toast';

interface TeamRow {
  id: string;
  name: string;
  leader: { id: string; name: string } | null;
  membersCount: number;
  leadsCount: number;
  nonNewLeadsCount: number;
  createdAt: string;
}

interface FormState {
  name: string;
  leaderId: string;
  memberIds: string[];
}

export default function AdminTeams() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast, updateToast } = useToast();
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [originalTeams, setOriginalTeams] = useState<TeamRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any | null>(null);

  const [allLeaders, setAllLeaders] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [memberQuery, setMemberQuery] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState<FormState>({ name: '', leaderId: '', memberIds: [] as string[] });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => { if (token) fetchData(); }, [token]);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      // Fetch teams, leaders and members (server-filtered endpoints)
      const [resTeams, resLeaders, resMembers] = await Promise.all([
        fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/teams/leaders', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/teams/members', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const tdata = await resTeams.json();
      const ldata = await resLeaders.json();
      const mdata = await resMembers.json();
      
      const teamsData = tdata.teams || [];
      setTeams(teamsData);
      setOriginalTeams(teamsData);

      const leaders = Array.isArray(ldata.employees) ? ldata.employees : [];
      const members = Array.isArray(mdata.employees) ? mdata.employees : [];
      setAllLeaders(leaders);
      setAllEmployees(members);
    } catch (error) {
      addToast('Failed to fetch teams', 'error');
    } finally { setLoadingData(false); }
  };

  const openCreate = () => {
    setEditingTeam(null);
    setForm({ name: '', leaderId: '', memberIds: [] });
    setShowModal(true);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setTeams(originalTeams);
      return;
    }
    const q = query.toLowerCase();
    setTeams(originalTeams.filter(t => 
      t.name.toLowerCase().includes(q) || 
      (t.leader?.name || '').toLowerCase().includes(q)
    ));
  };

  // ensure leader is not present in members when leader changes
  useEffect(() => {
    if (!form.leaderId) return;
    setForm(prev => ({ ...prev, memberIds: prev.memberIds.filter(id => id !== form.leaderId) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.leaderId]);

  const openEdit = async (teamId: string) => {
    try {
      const res = await fetch(`/api/teams/${teamId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load team');
      setEditingTeam(data.team);
      const leaderId = data.team.leader?.id || '';
      const memberIds = Array.isArray(data.team.members) ? data.team.members.map((m: any) => String(m._id)).filter((mid: string) => mid !== leaderId) : [];
      setForm({ name: data.team.name, leaderId, memberIds });
      setShowModal(true);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to load team', 'error');
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.leaderId) { addToast('Name and leader required', 'error'); return; }
    const toastId = addToast(editingTeam ? 'Updating team...' : 'Creating team...', 'loading');
    try {
      const url = editingTeam ? `/api/teams/${editingTeam.id}` : '/api/teams';
      const method = editingTeam ? 'PUT' : 'POST';
      const sanitizedMembers = Array.from(new Set((form.memberIds || []).map(String).filter(id => id && id !== form.leaderId)));
      const body: any = { name: form.name, leaderId: form.leaderId, memberIds: sanitizedMembers };
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      updateToast(toastId, '✅ Team saved', 'success');
      setShowModal(false);
      fetchData();
    } catch (error) {
      updateToast(toastId, error instanceof Error ? error.message : 'Failed to save', 'error');
    }
  };

  const handleDelete = async (teamId: string) => {
    if (!confirm('Delete team? This will remove team association from members.')) return;
    const toastId = addToast('Deleting team...', 'loading');
    try {
      const res = await fetch(`/api/teams/${teamId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete');
      updateToast(toastId, '✅ Team deleted', 'success');
      fetchData();
    } catch (error) {
      updateToast(toastId, error instanceof Error ? error.message : 'Failed to delete', 'error');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="animate-spin h-10 w-10 border-b-2 border-blue-500 rounded-full"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-gradient-to-br from-indigo-600 to-indigo-500 rounded-xl">
                <Users size={32} className="text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">Teams Management</h1>
                <p className="text-slate-400 mt-1">Create teams, assign leaders, and manage members</p>
              </div>
            </div>
          </div>
          <button 
            onClick={openCreate} 
            className="w-full md:w-auto bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/50"
          >
            <PlusCircle size={20} /> 
            Create New Team
          </button>
        </div>

        {/* Search and Stats */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                placeholder="Search teams or leader..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            <div className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-300 font-medium">
              {teams.length} Team{teams.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {loadingData ? (
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl border border-slate-700 p-12 text-center">
            <Loader className="animate-spin mx-auto mb-4 text-indigo-400" size={40} />
            <p className="text-slate-300 text-lg">Loading teams...</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl border border-slate-700 p-12 text-center">
            <AlertCircle size={48} className="mx-auto mb-4 text-amber-400" />
            <p className="text-slate-300 text-lg mb-1">No teams found</p>
            <p className="text-slate-400">Create your first team to get started</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {teams.map((t, idx) => (
              <div 
                key={t.id} 
                className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl border border-slate-700 hover:border-indigo-500 transition-all p-6 shadow-lg hover:shadow-xl"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Team Info */}
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">{t.name}</h3>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-slate-300 mb-4">
                      {/* Leader */}
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {t.leader?.name 
                            ? t.leader.name
                                .split(' ')
                                .map(s => s[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()
                            : '?'}
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Leader</p>
                          <p className="text-white font-medium">{t.leader?.name || '—'}</p>
                        </div>
                      </div>

                      {/* Members Count */}
                      <div className="flex items-center gap-2 bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/30">
                        <UserPlus size={16} className="text-blue-400" />
                        <div>
                          <p className="text-xs text-blue-300">Members</p>
                          <p className="text-white font-bold">{t.membersCount}</p>
                        </div>
                      </div>

                      {/* Total Leads */}
                      <div className="flex items-center gap-2 bg-cyan-500/10 px-3 py-2 rounded-lg border border-cyan-500/30">
                        <ArrowRight size={16} className="text-cyan-400" />
                        <div>
                          <p className="text-xs text-cyan-300">Total Leads</p>
                          <p className="text-white font-bold">{t.leadsCount}</p>
                        </div>
                      </div>

                      {/* Active Leads */}
                      <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/30">
                        <CheckCircle size={16} className="text-emerald-400" />
                        <div>
                          <p className="text-xs text-emerald-300">Active Leads</p>
                          <p className="text-white font-bold">{t.nonNewLeadsCount}</p>
                        </div>
                      </div>
                    </div>

                    {/* Created Date */}
                    <p className="text-xs text-slate-500">
                      Created: {new Date(t.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button 
                      onClick={() => openEdit(t.id)} 
                      className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 rounded-lg text-amber-400 transition-all hover:shadow-lg hover:shadow-amber-500/20"
                      title="Edit team"
                    >
                      <Edit2 size={18} />
                      <span className="hidden sm:inline font-medium">Edit</span>
                    </button>
                    <button 
                      onClick={() => handleDelete(t.id)} 
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 transition-all hover:shadow-lg hover:shadow-red-500/20"
                      title="Delete team"
                    >
                      <Trash2 size={18} />
                      <span className="hidden sm:inline font-medium">Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-700 overflow-hidden max-h-[90vh] flex flex-col my-auto">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-4 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-3">
                  {editingTeam ? (
                    <>
                      <div className="p-2 bg-white/10 rounded-lg">
                        <Edit2 size={20} className="text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Edit Team</h2>
                        <p className="text-indigo-100 text-sm">Update team information</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-2 bg-white/10 rounded-lg">
                        <PlusCircle size={20} className="text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Create New Team</h2>
                        <p className="text-indigo-100 text-sm">Set up a new team with a leader and members</p>
                      </div>
                    </>
                  )}
                </div>
                <button 
                  onClick={() => setShowModal(false)} 
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="overflow-y-auto flex-1">
                <div className="p-6 space-y-6">
                  {/* Team Name */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Team Name <span className="text-red-400 ml-1">*</span>
                    </label>
                    <input 
                      value={form.name} 
                      onChange={(e) => setForm({ ...form, name: e.target.value })} 
                      placeholder="e.g., Sales Team A, Enterprise Division"
                      className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                    />
                    <p className="text-xs text-slate-400 mt-1">Enter a unique name for your team</p>
                  </div>

                  {/* Team Leader */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Team Leader <span className="text-red-400 ml-1">*</span>
                    </label>
                    <select 
                      value={form.leaderId} 
                      onChange={(e) => setForm({ ...form, leaderId: e.target.value })} 
                      className="w-full px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    >
                      <option value="">Select a team leader...</option>
                      {allLeaders.map(l => (
                        <option key={l._id} value={l._id}>
                          {l.name} — {l.position || l.username}
                        </option>
                      ))}
                    </select>
                    {allLeaders.length === 0 && (
                      <div className="mt-2 p-3 bg-amber-500/10 border border-amber-500/50 rounded-lg text-amber-300 text-sm flex items-center gap-2">
                        <AlertCircle size={16} />
                        No users with "Team Leader" position available
                      </div>
                    )}
                    <p className="text-xs text-slate-400 mt-1">Choose a team leader to manage this team</p>
                  </div>

                  {/* Team Members */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-200 mb-2">
                      Team Members <span className="text-slate-400 text-xs ml-1">(Optional)</span>
                    </label>
                    <div className="relative mt-2">
                      <div 
                        onClick={() => setShowMemberDropdown(s => !s)} 
                        className="w-full min-h-[56px] px-4 py-3 rounded-lg bg-slate-900/50 border border-slate-600 flex items-center gap-2 flex-wrap cursor-pointer hover:border-slate-500 transition-colors"
                      >
                        {form.memberIds.length === 0 && (
                          <div className="text-slate-500 flex items-center gap-2">
                            <UserPlus size={16} />
                            <span>Click to add members...</span>
                          </div>
                        )}
                        {form.memberIds.map(id => {
                          const emp = allEmployees.find(e => String(e._id) === String(id));
                          if (!emp) return null;
                          return (
                            <div 
                              key={id} 
                              className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 border border-indigo-400/50 rounded-full text-sm text-white flex items-center gap-2 shadow-lg"
                            >
                              <span className="font-medium">{emp.name}</span>
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setForm(prev => ({ ...prev, memberIds: prev.memberIds.filter(mid => mid !== id) })); 
                                }} 
                                className="text-indigo-200 hover:text-white font-bold transition-colors ml-1"
                              >
                                ×
                              </button>
                            </div>
                          );
                        })}
                        <div className="ml-auto text-slate-400 text-sm">▾</div>
                      </div>

                      {showMemberDropdown && (
                        <div className="absolute left-0 right-0 bottom-full mb-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto z-50">
                          <div className="p-3 border-b border-slate-700 sticky top-0 bg-slate-800">
                            <input 
                              placeholder="Search members..." 
                              value={memberQuery} 
                              onChange={(e) => setMemberQuery(e.target.value)} 
                              className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500 focus:outline-none text-sm transition-all"
                            />
                          </div>
                          <div className="p-2">
                            {allEmployees
                              .filter((emp: any) => String(emp._id) !== String(form.leaderId))
                              .filter((emp: any) => {
                                const q = memberQuery.trim().toLowerCase();
                                if (!q) return true;
                                return (emp.name || '').toLowerCase().includes(q) || (emp.username || '').toLowerCase().includes(q);
                              })
                              .map((emp: any) => (
                                <label 
                                  key={emp._id} 
                                  className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors"
                                >
                                  <input 
                                    type="checkbox" 
                                    checked={form.memberIds.map(String).includes(String(emp._id))} 
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setForm(prev => ({ 
                                        ...prev, 
                                        memberIds: checked 
                                          ? [...prev.memberIds, String(emp._id)] 
                                          : prev.memberIds.filter(id => id !== String(emp._id)) 
                                      }));
                                    }} 
                                    className="rounded cursor-pointer w-4 h-4 accent-indigo-500"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium text-slate-200">{emp.name}</div>
                                    <div className="text-sm text-slate-400">{emp.position || emp.username}</div>
                                  </div>
                                </label>
                              ))}
                            {allEmployees.filter((emp: any) => String(emp._id) !== String(form.leaderId)).filter((emp: any) => {
                              const q = memberQuery.trim().toLowerCase();
                              if (!q) return true;
                              return (emp.name || '').toLowerCase().includes(q) || (emp.username || '').toLowerCase().includes(q);
                            }).length === 0 && (
                              <div className="py-6 text-center text-slate-400 text-sm">
                                No members available
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Add team members to this team</p>
                  </div>
                </div>
              </div>

              {/* Modal Footer - Fixed */}
              <div className="flex gap-3 justify-end p-6 border-t border-slate-700 bg-slate-900/50 flex-shrink-0">
                <button 
                  onClick={() => setShowModal(false)} 
                  className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-all"
                >
                  Cancel
                </button>
                <button 
                  disabled={!form.name || !form.leaderId} 
                  onClick={handleSave} 
                  className={`px-6 py-2.5 rounded-lg text-white font-medium transition-all ${
                    (!form.name || !form.leaderId) 
                      ? 'bg-slate-600 cursor-not-allowed opacity-50' 
                      : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 shadow-lg hover:shadow-indigo-500/50'
                  }`}
                >
                  {editingTeam ? 'Update Team' : 'Create Team'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
