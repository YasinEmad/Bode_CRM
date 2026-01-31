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
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="text-slate-300 hover:text-white p-2 rounded-md bg-slate-800/40">
            <ArrowLeft />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Devices for {employee.name || employee.username}</h1>
            <p className="text-slate-400">Manage allowed device IDs for this employee</p>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg text-white font-semibold mb-3">Allowed Devices</h2>
          {deviceIds.length === 0 ? (
            <p className="text-slate-400">No devices registered for this employee.</p>
          ) : (
            <ul className="space-y-2">
              {deviceIds.map((d, idx) => (
                <li key={`${d}-${idx}`} className="flex items-center justify-between bg-slate-900/40 p-3 rounded-md">
                  <code className="font-mono text-cyan-300 break-all">{d}</code>
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigator.clipboard.writeText(d).then(() => addToast('Copied!', 'success'))} className="px-3 py-1 bg-slate-700 rounded-md text-sm text-white">Copy</button>
                    <button onClick={() => setDeleteTargetId(d)} className="px-3 py-1 bg-rose-600 rounded-md text-sm text-white flex items-center gap-2"><Trash2 size={14}/> Remove</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-slate-800 rounded-xl p-6">
          <h2 className="text-lg text-white font-semibold mb-3">Add Device</h2>
          <div className="flex gap-2">
            <input value={newDeviceId} onChange={(e) => setNewDeviceId(e.target.value)} placeholder="Paste device ID here" className="flex-1 p-3 rounded-md bg-slate-900/60 text-slate-200" />
            <button onClick={handleAddDevice} disabled={saving} className="px-4 py-2 bg-emerald-600 rounded-md text-white flex items-center gap-2">
              <Plus size={16} /> Add
            </button>
          </div>
          <p className="text-slate-400 text-sm mt-3">When an employee has one or more allowed devices they can check-in from them. For first-time registration the system may auto-register the first device. Removing a device prevents check-ins from that device.</p>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteTargetId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
              <div className="p-6 border-b border-slate-600">
                <h2 className="text-2xl font-bold text-white">Remove Device</h2>
                <p className="text-slate-400 text-sm mt-1">This device will no longer be allowed for check-ins.</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-slate-900/40 border border-slate-700 rounded-lg p-3">
                  <p className="text-xs text-slate-400 mb-2">Device ID:</p>
                  <code className="font-mono text-cyan-300 text-sm break-all">{deleteTargetId}</code>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => handleRemoveDevice(deleteTargetId)}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white py-2 rounded-lg font-semibold transition-all"
                  >
                    Remove Device
                  </button>
                  <button
                    onClick={() => setDeleteTargetId(null)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-semibold transition-all border border-slate-600"
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
