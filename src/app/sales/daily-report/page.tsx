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

  const [sheets, setSheets] = useState<number>(0);
  const [meetings, setMeetings] = useState<number>(0);
  const [requests, setRequests] = useState<number>(0);
  const [todayKey, setTodayKey] = useState<string>('');
  const [monthLabel, setMonthLabel] = useState<string>('');
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
      setSheets(Number(data.sheets?.[data.today] || 0));
      setMeetings(Number(data.meetings?.[data.today] || 0));
      setRequests(Number(data.requests?.[data.today] || 0));
      setMonthLabel(data.month);
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
      const res = await fetch('/api/sales/daily-report', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sheets, meetings, requests }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Save failed');
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

        <div className="space-y-4">
          <label className="block">
            <span className="text-sm text-slate-300">{getLabel('sheets', 'Sheets')}</span>
            <input
              type="number"
              min={0}
              value={sheets}
              onChange={(e) => setSheets(Math.max(0, parseInt(e.target.value || '0')))}
              className="mt-1 block w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-300">{getLabel('meetings', 'Meetings')}</span>
            <input
              type="number"
              min={0}
              value={meetings}
              onChange={(e) => setMeetings(Math.max(0, parseInt(e.target.value || '0')))}
              className="mt-1 block w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-sm text-slate-300">{getLabel('requests', 'Requests')}</span>
            <input
              type="number"
              min={0}
              value={requests}
              onChange={(e) => setRequests(Math.max(0, parseInt(e.target.value || '0')))}
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
