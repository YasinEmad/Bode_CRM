'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';
import { Loader, Plus, Trash2, ArrowLeft } from 'lucide-react';

export default function EmployeeDevicesPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast, updateToast } = useToast();

  const [employee, setEmployee] = useState<any | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [newDeviceId, setNewDeviceId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (token && id) fetchEmployee();
  }, [token, id]);

  const fetchEmployee = async () => {
    setLoadingData(true);
    try {
      const res = await fetch(`/api/employees/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch employee');
      const data = await res.json();
      setEmployee(data.employee || data.user || data);
    } catch (err) {
      console.error('Error fetching employee:', err);
      addToast('Failed to load employee', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddDevice = async () => {
    if (!newDeviceId || !newDeviceId.trim()) {
      addToast('Enter a device ID to add', 'error');
      return;
    }
    setSaving(true);
    const toastId = addToast('Adding device...', 'loading');
    try {
      const res = await fetch(`/api/admin/users/${id}/device`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ deviceId: newDeviceId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to add device');
      updateToast(toastId, 'Device added', 'success');
      setNewDeviceId('');
      await fetchEmployee();
    } catch (err) {
      updateToast(toastId, err instanceof Error ? err.message : 'Failed to add device', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string | null) => {
    if (!deviceId) return;
    const toastId = addToast('Removing device...', 'loading');
    try {
      const res = await fetch(`/api/admin/users/${id}/device`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ deviceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.message || 'Failed to remove device');
      updateToast(toastId, 'Device removed', 'success');
      setDeleteTargetId(null);
      await fetchEmployee();
    } catch (err) {
      updateToast(toastId, err instanceof Error ? err.message : 'Failed to remove device', 'error');
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-300">Employee not found</div>
      </div>
    );
  }

  const deviceIds: string[] = Array.isArray(employee.deviceIds) ? employee.deviceIds : (employee.deviceId ? [employee.deviceId] : []);

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="text-slate-300 hover:text-white p-2 rounded-md bg-slate-800/40">
            <ArrowLeft />
          </button>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white">Devices for {employee.name || employee.username}</h1>
            <p className="text-slate-300">Manage allowed device IDs for this employee — control where they can check in from.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 items-start">
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-700/40 rounded-xl p-4 sm:p-6 shadow-lg border border-slate-700">
            <h2 className="text-lg text-white font-semibold mb-3">Allowed Devices</h2>
          {deviceIds.length === 0 ? (
            <p className="text-slate-400">No devices registered for this employee.</p>
          ) : (
            <ul className="space-y-3 max-h-[60vh] overflow-auto pr-2">
              {deviceIds.map((d, idx) => (
                <li key={`${d}-${idx}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-slate-900/40 p-3 rounded-md hover:shadow-xl transition-shadow">
                  <div className="w-full sm:flex-1 mb-3 sm:mb-0">
                    <pre className="m-0 font-mono text-cyan-300 text-sm break-words whitespace-pre-wrap bg-transparent">{d}</pre>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => navigator.clipboard.writeText(d).then(() => addToast('Copied!', 'success'))}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-md text-sm text-white"
                      aria-label="Copy device id"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-7-4h6" />
                      </svg>
                      Copy
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(d)}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-rose-600 hover:bg-rose-700 rounded-md text-sm text-white"
                      aria-label="Remove device id"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          </div>
          <div className="bg-gradient-to-br from-slate-800/60 to-slate-700/40 rounded-xl p-4 sm:p-6 shadow-lg border border-slate-700">
            <h2 className="text-lg text-white font-semibold mb-3">Add Device</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={newDeviceId}
                onChange={(e) => setNewDeviceId(e.target.value)}
                placeholder="Paste device ID here"
                className="flex-1 p-3 rounded-md bg-slate-900/60 text-slate-200 min-h-[44px]"
              />
              <button
                onClick={handleAddDevice}
                disabled={saving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-md text-white font-semibold"
              >
                <Plus size={16} />
                Add
              </button>
            </div>
            <p className="text-slate-300 text-sm mt-3">When an employee has one or more allowed devices they can check-in from them. For first-time registration the system may auto-register the first device. Removing a device prevents check-ins from that device.</p>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteTargetId && (
          <div className="fixed inset-0 bg-slate-800/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700 max-h-[calc(100vh-6rem)] overflow-auto ring-1 ring-slate-700">
              <div className="p-4 sm:p-6 border-b border-slate-600">
                <h2 className="text-2xl font-bold text-white">Remove Device</h2>
                <p className="text-slate-400 text-sm mt-1">This device will no longer be allowed for check-ins.</p>
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-2">Device ID:</p>
                  <pre className="m-0 font-mono text-cyan-300 text-sm break-words whitespace-pre-wrap">{deleteTargetId}</pre>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => handleRemoveDevice(deleteTargetId)}
                    className="w-full sm:flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white py-3 rounded-lg font-semibold transition-all"
                  >
                    Remove Device
                  </button>
                  <button
                    onClick={() => setDeleteTargetId(null)}
                    className="w-full sm:flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-semibold transition-all border border-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
