'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Loader, Edit2, Trash2, PlusCircle, Users, User, CheckCircle, AlertCircle, Search } from 'lucide-react';
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-10 w-10 border-b-2 border-blue-500 rounded-full"></div></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="text-indigo-500" />
            Create and Manage Teams
          </h1>
          <p className="text-sm text-slate-400 mt-1">Create teams, assign Team Leaders, and manage members</p>
        </div>
        <button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors">
          <PlusCircle size={18} /> Create Team
        </button>
      </div>

      <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10 rounded-lg p-6">
        {/* Search bar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-xs">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search teams or leader..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2 rounded bg-slate-900/50 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div className="text-sm text-slate-400">{teams.length} team{teams.length !== 1 ? 's' : ''}</div>
        </div>

        {loadingData ? (
          <div className="py-12 text-center">
            <Loader className="animate-spin mx-auto mb-3 text-indigo-400" />
            <p className="text-slate-400">Loading teams...</p>
          </div>
        ) : teams.length === 0 ? (
          <div className="py-12 text-center">
            <AlertCircle size={32} className="mx-auto mb-3 text-amber-400" />
            <p className="text-slate-400">No teams found. Create your first team to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 font-semibold text-slate-300">Team Name</th>
                  <th className="px-4 py-3 font-semibold text-slate-300">Team Leader</th>
                  <th className="px-4 py-3 font-semibold text-slate-300 text-center">Members</th>
                  <th className="px-4 py-3 font-semibold text-slate-300 text-center">Total Leads</th>
                  <th className="px-4 py-3 font-semibold text-slate-300 text-center">Active Leads</th>
                  <th className="px-4 py-3 font-semibold text-slate-300">Created Date</th>
                  <th className="px-4 py-3 font-semibold text-slate-300 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t, idx) => (
                  <tr key={t.id} className={`border-t border-white/5 hover:bg-white/5 transition-colors ${idx % 2 === 0 ? 'bg-white/2' : ''}`}>
                    <td className="px-4 py-4 font-semibold">{t.name}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {t.leader?.name 
                            ? t.leader.name
                                .split(' ')
                                .map(s => s[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()
                            : '?'}
                        </div>
                        <span className="text-slate-300">{t.leader?.name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">
                        {t.membersCount}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-sm font-medium">
                        {t.leadsCount}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-sm font-medium">
                        {t.nonNewLeadsCount}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-400">
                      {new Date(t.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => openEdit(t.id)} 
                          className="p-2 bg-amber-500/20 hover:bg-amber-500/30 rounded text-amber-400 transition-colors"
                          title="Edit team"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(t.id)} 
                          className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded text-red-400 transition-colors"
                          title="Delete team"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg shadow-2xl max-w-2xl w-full border border-white/10">
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/10">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {editingTeam ? (
                  <>
                    <Edit2 size={20} className="text-amber-400" />
                    Edit Team
                  </>
                ) : (
                  <>
                    <PlusCircle size={20} className="text-indigo-400" />
                    Create New Team
                  </>
                )}
              </h2>
              <button 
                onClick={() => setShowModal(false)} 
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Team Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Team Name <span className="text-red-400">*</span>
                </label>
                <input 
                  value={form.name} 
                  onChange={(e) => setForm({ ...form, name: e.target.value })} 
                  placeholder="e.g., Sales Team A, Enterprise Team"
                  className="w-full px-3 py-2 rounded bg-slate-900/50 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors" 
                />
              </div>

              {/* Team Leader */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Team Leader <span className="text-red-400">*</span>
                </label>
                <select 
                  value={form.leaderId} 
                  onChange={(e) => setForm({ ...form, leaderId: e.target.value })} 
                  className="w-full px-3 py-2 rounded bg-slate-900/50 border border-white/10 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">Select a team leader...</option>
                  {allLeaders.map(l => (
                    <option key={l._id} value={l._id}>
                      {l.name} — {l.position || l.username}
                    </option>
                  ))}
                </select>
                {allLeaders.length === 0 && (
                  <p className="text-sm text-amber-400 mt-2">⚠️ No users with "Team Leader" position available</p>
                )}
              </div>

              {/* Team Members */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Team Members <span className="text-slate-500">(Optional)</span>
                </label>
                <div className="relative mt-2">
                  <div 
                    onClick={() => setShowMemberDropdown(s => !s)} 
                    className="w-full min-h-[44px] px-3 py-2 rounded bg-slate-900/50 border border-white/10 flex items-center gap-2 flex-wrap cursor-pointer hover:border-white/20 transition-colors"
                  >
                    {form.memberIds.length === 0 && <div className="text-slate-400">Select members to add...</div>}
                    {form.memberIds.map(id => {
                      const emp = allEmployees.find(e => String(e._id) === String(id));
                      if (!emp) return null;
                      return (
                        <div 
                          key={id} 
                          className="px-3 py-1 bg-indigo-500/20 border border-indigo-500/50 rounded-full text-sm text-indigo-200 flex items-center gap-2"
                        >
                          <span>{emp.name}</span>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setForm(prev => ({ ...prev, memberIds: prev.memberIds.filter(mid => mid !== id) })); 
                            }} 
                            className="text-indigo-300 hover:text-indigo-100 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                    <div className="ml-auto text-slate-400 text-sm">▾</div>
                  </div>

                  {showMemberDropdown && (
                    <div className="absolute left-0 right-0 mt-2 bg-slate-800 border border-white/10 rounded shadow-lg max-h-72 overflow-y-auto z-50">
                      <div className="p-3 border-b border-white/10 sticky top-0 bg-slate-800/95">
                        <input 
                          placeholder="Search members..." 
                          value={memberQuery} 
                          onChange={(e) => setMemberQuery(e.target.value)} 
                          className="w-full px-3 py-2 rounded bg-slate-900/50 border border-white/10 text-white placeholder-slate-400 focus:outline-none text-sm"
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
                              className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-700/50 cursor-pointer transition-colors"
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
                                className="rounded cursor-pointer"
                              />
                              <div>
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
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-white/10">
                <button 
                  onClick={() => setShowModal(false)} 
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  disabled={!form.name || !form.leaderId} 
                  onClick={handleSave} 
                  className={`px-4 py-2 rounded text-white font-medium transition-colors ${
                    (!form.name || !form.leaderId) 
                      ? 'bg-slate-600 cursor-not-allowed text-slate-400' 
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {editingTeam ? 'Update Team' : 'Create Team'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
