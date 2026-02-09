'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useToast } from '@/components/Toast';
import { Loader } from 'lucide-react';

export default function PushTestPage() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast, updateToast } = useToast();
  const [employeesCount, setEmployeesCount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (token) fetchCount();
  }, [token]);

  const fetchCount = async () => {
    try {
      const res = await fetch('/api/employees', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data.employees)) setEmployeesCount(data.employees.length);
      else setEmployeesCount(0);
    } catch (e) {
      setEmployeesCount(0);
    }
  };

  const sendTest = async () => {
    if (!token) return;
    setSending(true);
    const toastId = addToast('Sending test push...', 'loading');
    try {
      // fetch employees ids
      const res = await fetch('/api/employees', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const ids = Array.isArray(data.employees) ? data.employees.map((e: any) => e._id) : [];

      const sendRes = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userIds: ids.slice(0, 50), title: 'اختبار إشعار', message: 'هذا إشعار تجريبي من لوحة الإدارة', url: '/' }),
      });

      if (sendRes.ok) {
        updateToast(toastId, 'Test push sent', 'success');
      } else {
        const err = await sendRes.json().catch(() => ({}));
        updateToast(toastId, 'Failed to send test push: ' + (err.error || sendRes.statusText), 'error');
      }
    } catch (e: any) {
      updateToast(toastId, 'Error sending test push: ' + (e.message || String(e)), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navbar />
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-white mb-2">Send Test Push</h1>
        <p className="text-slate-400 mb-6">This sends a test push notification to registered subscriptions (first 50 users).</p>

        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
          <p className="text-slate-300">Employees with accounts: <strong className="text-white">{employeesCount ?? '...'}</strong></p>
          <div className="mt-4">
            <button
              className={`inline-flex items-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white ${sending ? 'opacity-80 cursor-wait' : ''}`}
              onClick={sendTest}
              disabled={sending}
              title="Send test push to all employees"
            >
              {sending ? <Loader className="animate-spin" /> : null}
              Send Test Push
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
