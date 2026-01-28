'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Loader, Edit2, Trash2, PlusCircle, Users, User, CheckCircle } from 'lucide-react';
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

export default function AdminTeams() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast, updateToast } = useToast();
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any | null>(null);

  const [allLeaders, setAllLeaders] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [memberQuery, setMemberQuery] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);

  const [form, setForm] = useState({ name: '', leaderId: '', memberIds: [] as string[] });

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
      setTeams(tdata.teams || []);

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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Create and Manage Teams</h1>
          <p className="text-sm text-slate-400">Create teams, assign a Team Leader and add members</p>
        </div>
        <div className="flex gap-3">
          <button onClick={openCreate} className="bg-indigo-600 text-white px-4 py-2 rounded flex items-center gap-2"><PlusCircle /> Create Team</button>
        </div>
      </div>
      <div className="bg-white/5 rounded p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                placeholder="Search teams or leader..."
                onChange={(e) => {
                  const q = e.target.value.toLowerCase();
                  setTeams(prev => (prev as TeamRow[]).filter(t => t.name.toLowerCase().includes(q) || (t.leader?.name || '').toLowerCase().includes(q)));
                  if (!e.target.value) fetchData();
                }}
                className="px-3 py-2 rounded bg-slate-900 text-white w-72"
              />
            </div>
          </div>
          <div className="text-sm text-slate-400">{teams.length} teams</div>
        </div>

        {loadingData ? <div className="py-8 text-center"><Loader className="animate-spin" /></div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[720px]">
              <thead>
                <tr>
                  <th className="px-4 py-3">Team</th>
                  <th className="px-4 py-3">Leader</th>
                  <th className="px-4 py-3 text-center">Members</th>
                  <th className="px-4 py-3 text-center">Leads</th>
                  <th className="px-4 py-3 text-center">Non-new</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map(t => (
                  <tr key={t.id} className="border-t border-white/10 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 font-semibold">{t.name}</td>
                    <td className="px-4 py-3 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold text-sm">
                        {t.leader?.name ? t.leader.name.split(' ').map(s => s[0]).slice(0,2).join('') : '--'}
                      </div>
                      <div>{t.leader?.name || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-center">{t.membersCount}</td>
                    <td className="px-4 py-3 text-center">{t.leadsCount}</td>
                    <td className="px-4 py-3 text-center">{t.nonNewLeadsCount}</td>
                    <td className="px-4 py-3">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => openEdit(t.id)} className="p-2 bg-amber-600 rounded text-white"><Edit2 /></button>
                        <button onClick={() => handleDelete(t.id)} className="p-2 bg-red-600 rounded text-white"><Trash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {teams.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">No teams found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingTeam ? 'Edit Team' : 'Create Team'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400">Close</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm">Team Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded bg-slate-900" />
              </div>

              <div>
                <label className="block text-sm">Team Leader</label>
                <select value={form.leaderId} onChange={(e) => setForm({ ...form, leaderId: e.target.value })} className="w-full px-3 py-2 rounded bg-slate-900">
                  <option value="">Select leader</option>
                  {allLeaders.map(l => <option key={l._id} value={l._id}>{l.name} — {l.position || l.username}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm">Members</label>
                <div className="relative mt-2">
                  <div onClick={() => setShowMemberDropdown(s => !s)} className="w-full min-h-[44px] px-3 py-2 rounded bg-slate-900 flex items-center gap-2 flex-wrap cursor-pointer">
                    {form.memberIds.length === 0 && <div className="text-slate-400">Select members...</div>}
                        {form.memberIds.map(id => {
                          const emp = allEmployees.find(e => String(e._id) === String(id));
                      if (!emp) return null;
                      return (
                        <div key={id} className="px-2 py-1 bg-slate-700 rounded text-sm flex items-center gap-2">
                          <span>{emp.name}</span>
                          <button onClick={(e) => { e.stopPropagation(); setForm(prev => ({ ...prev, memberIds: prev.memberIds.filter(mid => mid !== id) })); }} className="text-slate-300">×</button>
                        </div>
                      );
                    })}
                    <div className="ml-auto text-slate-400">▾</div>
                  </div>

                  {showMemberDropdown && (
                    <div className="absolute left-0 right-0 mt-2 bg-slate-800 rounded shadow max-h-64 overflow-y-auto z-50 p-3">
                      <input placeholder="Search members..." value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} className="w-full px-3 py-2 rounded bg-slate-900 mb-2" />
                      <div className="grid grid-cols-1 gap-2">
                        {allEmployees
                          .filter((emp: any) => String(emp._id) !== String(form.leaderId))
                          .filter((emp: any) => {
                          const q = memberQuery.trim().toLowerCase();
                          if (!q) return true;
                          return (emp.name || '').toLowerCase().includes(q) || (emp.username || '').toLowerCase().includes(q);
                          }).map((emp: any) => (
                          <label key={emp._id} className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-slate-700">
                            <div className="flex items-center gap-2">
                              <input type="checkbox" checked={form.memberIds.map(String).includes(String(emp._id))} onChange={(e) => {
                                const checked = e.target.checked;
                                setForm(prev => ({ ...prev, memberIds: checked ? [...prev.memberIds, String(emp._id)] : prev.memberIds.filter(id => id !== String(emp._id)) }));
                              }} />
                              <span>{emp.name} <span className="text-slate-400">— {emp.position || '—'}</span></span>
                            </div>
                            <div className="text-slate-400">{emp.username}</div>
                          </label>
                        ))}
                        {allEmployees.filter((emp: any) => String(emp._id) !== String(form.leaderId)).filter((emp: any) => {
                          const q = memberQuery.trim().toLowerCase();
                          if (!q) return true;
                          return (emp.name || '').toLowerCase().includes(q) || (emp.username || '').toLowerCase().includes(q);
                        }).length === 0 && (
                          <div className="py-4 text-center text-slate-400">No members found</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-slate-700 rounded">Cancel</button>
                <button disabled={!form.name || !form.leaderId} onClick={handleSave} className={`px-4 py-2 rounded text-white ${(!form.name || !form.leaderId) ? 'bg-slate-500 cursor-not-allowed' : 'bg-emerald-600'}`}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
