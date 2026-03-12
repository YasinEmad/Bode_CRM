'use client';

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { Loader } from 'lucide-react';
import useLabels from '@/hooks/useLabels';

export default function SalesDailyReport() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const { get: getLabel } = useLabels();

  // use undefined initially so inputs render blank instead of 0
  const [sheets, setSheets] = useState<number | undefined>(undefined);
  const [meetings, setMeetings] = useState<number | undefined>(undefined);
  const [requests, setRequests] = useState<number | undefined>(undefined);
  const [todayKey, setTodayKey] = useState<string>('');
  const [monthLabel, setMonthLabel] = useState<string>('');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'sales')) {
      router.push('/unauthorized');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (token && user?.role === 'sales') fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  const fetchData = async () => {
    try {
      setLoadingData(true);
      const res = await fetch('/api/sales/daily-report', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setTodayKey(data.today);
      // when there is no entry for today keep undefined so field stays blank
      setSheets(
        data.sheets && typeof data.sheets[data.today] !== 'undefined'
          ? Number(data.sheets[data.today])
          : undefined
      );
      setMeetings(
        data.meetings && typeof data.meetings[data.today] !== 'undefined'
          ? Number(data.meetings[data.today])
          : undefined
      );
      setRequests(
        data.requests && typeof data.requests[data.today] !== 'undefined'
          ? Number(data.requests[data.today])
          : undefined
      );
      setMonthLabel(data.month);
      setTeamId(data.teamId || null);
    } catch (err) {
      console.error(err);
      addToast('Failed to load daily report', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  const save = async () => {
    try {
      setSaving(true);
      // undefined values are omitted by JSON.stringify,
      // so we only send fields the user has touched.
      const payload: any = {};
      if (typeof sheets !== 'undefined') payload.sheets = sheets;
      if (typeof meetings !== 'undefined') payload.meetings = meetings;
      if (typeof requests !== 'undefined') payload.requests = requests;
      const res = await fetch('/api/sales/daily-report', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        // if the server provided a specific message we surface it so the
        // user knows they might need to contact an admin or join a team.
        const msg = err.error || 'Save failed';
        throw new Error(msg);
      }
      addToast('Saved successfully', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to save daily data', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="max-w-xl mx-auto bg-slate-800 rounded-2xl p-6 border border-slate-700">
        <h1 className="text-3xl font-bold text-white mb-2">Daily Report</h1>
        <p className="text-slate-400 mb-4">Date: <strong className="text-white">{todayKey} ({monthLabel})</strong></p>
        {teamId === null && (
          <p className="text-yellow-300 mb-4">
            You are not currently assigned to a team. Your numbers are still
            saved but you may not appear in team‑based reports; contact an admin
            if this looks wrong.
          </p>
        )}

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm text-slate-300">{getLabel('sheets', 'Sheets')}</span>
            <input
              type="number"
              min={0}
              value={sheets ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setSheets(v === '' ? undefined : Math.max(0, parseInt(v)));
              }}
              className="mt-1 block w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-300">{getLabel('meetings', 'Meetings')}</span>
            <input
              type="number"
              min={0}
              value={meetings ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setMeetings(v === '' ? undefined : Math.max(0, parseInt(v)));
              }}
              className="mt-1 block w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-300">{getLabel('requests', 'Requests')}</span>
            <input
              type="number"
              min={0}
              value={requests ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setRequests(v === '' ? undefined : Math.max(0, parseInt(v)));
              }}
              className="mt-1 block w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
            />
          </label>

          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">Assessment: view-only (team leader only)</p>
            <button
              onClick={save}
              disabled={saving}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Today'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
