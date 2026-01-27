'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, MapPin, Save, RefreshCw } from 'lucide-react';

interface SystemSettings {
  _id?: string;
  officeLatitude: number;
  officeLongitude: number;
  officeName: string;
  attendanceRadius: number;
  attendanceTime: string;
  commissionRules: Array<{ position: string; percentage: number }>;
}

export default function AdminSettings() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast, updateToast } = useToast();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Employees device management
  const [employees, setEmployees] = useState<Array<any>>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [editingDeviceIdId, setEditingDeviceIdId] = useState<string | null>(null);
  const [deviceIdEditValue, setDeviceIdEditValue] = useState<string>('');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (token) {
      fetchSettings();
      fetchEmployees();
    }
  }, [token]);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const res = await fetch('/api/employees', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setEmployees(Array.isArray(data.employees) ? data.employees : []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      addToast('Failed to fetch employees', 'error');
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleEditDevice = (emp: any) => {
    setEditingDeviceIdId(emp._id);
    setDeviceIdEditValue(emp.deviceId || '');
  };

  const handleSaveDevice = async (empId: string) => {
    const toastId = addToast('Saving device id...', 'loading');
    try {
      const res = await fetch(`/api/employees/${empId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deviceId: deviceIdEditValue || null }),
      });

      if (!res.ok) throw new Error('Failed to update device id');

      const data = await res.json();
      setEmployees(employees.map(e => (e._id === empId ? data.employee : e)));
      updateToast(toastId, 'Device ID updated', 'success');
      setEditingDeviceIdId(null);
      setDeviceIdEditValue('');
    } catch (error) {
      updateToast(toastId, error instanceof Error ? error.message : 'Failed to update device id', 'error');
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSettings(data.settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      addToast('Failed to fetch settings', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    const toastId = addToast('Saving settings...', 'loading');

    try {
      // Filter out rules with 0 percentage
      const filteredRules = settings.commissionRules.filter(rule => rule.percentage > 0);
      
      // Sanitize attendanceTime - ensure it's in correct HH:mm format
      let attendanceTime = settings.attendanceTime;
      if (attendanceTime) {
        attendanceTime = attendanceTime.trim();
        // Validate format HH:mm
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(attendanceTime)) {
          throw new Error('Invalid time format. Use HH:mm (24-hour format, e.g., 09:00 or 14:30)');
        }
      }
      
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          ...settings, 
          attendanceTime,
          commissionRules: filteredRules 
        }),
      });

      if (!res.ok) throw new Error('Failed to save settings');

      const data = await res.json();
      setSettings(data.settings);
      updateToast(toastId, 'Settings saved successfully!', 'success');
    } catch (error) {
      updateToast(toastId, error instanceof Error ? error.message : 'Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecalculateCommissions = async () => {
    setIsRecalculating(true);
    const toastId = addToast('Recalculating commissions...', 'loading');

    try {
      const res = await fetch('/api/commissions/recalculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to recalculate');

      const data = await res.json();
      updateToast(toastId, `${data.message}`, 'success');
    } catch (error) {
      updateToast(toastId, error instanceof Error ? error.message : 'Failed to recalculate', 'error');
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      const toastId = addToast('Getting your location...', 'loading');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (settings) {
            setSettings({
              ...settings,
              officeLatitude: position.coords.latitude,
              officeLongitude: position.coords.longitude,
            });
            updateToast(toastId, 'Location updated!', 'success');
          } else {
            updateToast(toastId, 'Settings not loaded', 'error');
          }
        },
        (error) => {
          updateToast(toastId, `Error: ${error.message}`, 'error');
        }
      );
    } else {
      addToast('Geolocation not supported', 'error');
    }
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
        <div className="max-w-2xl mx-auto bg-slate-800 rounded-2xl shadow-xl p-8 text-center border border-slate-700">
          <p className="text-slate-400">Failed to load settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">System Settings</h1>
          <p className="text-slate-400">Configure office location, attendance, and commission rules</p>
        </div>

        <div className="space-y-8">
          {/* Office Location Section */}
          <section className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 md:p-8 border border-slate-700">
            <div className="flex items-center gap-3 mb-6">
              <MapPin size={28} className="text-blue-400" />
              <h2 className="text-2xl font-bold text-white">Office Location</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Office Name</label>
                <input
                  type="text"
                  value={settings.officeName}
                  onChange={(e) => setSettings({ ...settings, officeName: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={settings.officeLatitude}
                    onChange={(e) =>
                      setSettings({ ...settings, officeLatitude: parseFloat(e.target.value) })
                    }
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={settings.officeLongitude}
                    onChange={(e) =>
                      setSettings({ ...settings, officeLongitude: parseFloat(e.target.value) })
                    }
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <button
                onClick={handleGetCurrentLocation}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <MapPin size={18} />
                Use Current Location
              </button>
            </div>
          </section>

          {/* Attendance Settings */}
          <section className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 md:p-8 border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6">Attendance Settings</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Attendance Time (required arrival time)
                </label>
                <input
                  type="time"
                  value={settings.attendanceTime}
                  onChange={(e) => setSettings({ ...settings, attendanceTime: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 transition"
                />
                <p className="text-sm text-slate-400 mt-2">
                  Employees who check in after this time will be marked as late
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Allowed Radius (meters)
                </label>
                <input
                  type="number"
                  value={settings.attendanceRadius}
                  onChange={(e) => setSettings({ ...settings, attendanceRadius: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 transition"
                />
                <p className="text-sm text-slate-400 mt-2">
                  Employees must be within this distance from office to mark attendance
                </p>
              </div>
            </div>
          </section>

          {/* Employee Devices Management */}
          <section className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 md:p-8 border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6">Employee Devices</h2>

            <div className="space-y-4">
              {loadingEmployees ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
                </div>
              ) : employees.length === 0 ? (
                <p className="text-slate-400">No employees found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-600">
                        <th className="px-4 py-3 text-left text-sm font-bold text-white">Name</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-white">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-white">Device ID</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-white">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp) => (
                        <tr key={emp._id} className="border-b border-slate-600 hover:bg-slate-700/40 transition-colors">
                          <td className="px-4 py-3 text-sm text-white font-semibold">{emp.name}</td>
                          <td className="px-4 py-3 text-sm text-slate-400">{emp.email}</td>
                          <td className="px-4 py-3 text-sm text-slate-300">
                            {editingDeviceIdId === emp._id ? (
                              <input
                                type="text"
                                value={deviceIdEditValue}
                                onChange={(e) => setDeviceIdEditValue(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                              />
                            ) : (
                              <div className="break-all">{emp.deviceId || <span className="text-slate-500">Not set</span>}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {editingDeviceIdId === emp._id ? (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleSaveDevice(emp._id)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => { setEditingDeviceIdId(null); setDeviceIdEditValue(''); }}
                                  className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-lg"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEditDevice(emp)}
                                className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded-lg"
                              >
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          {/* Commission Rules Section */}
          <section className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 md:p-8 border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-8">Commission Rules by Position</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                { position: 'Senior', key: 'senior' },
                { position: 'Fresh', key: 'fresh' },
                { position: 'Team Lead', key: 'teamlead' },
                { position: 'Mid', key: 'mid' },
              ].map(({ position, key }) => {
                const rule = settings.commissionRules?.find(
                  (r: any) => (r.position || '').toLowerCase() === position.toLowerCase()
                );
                const percentage = rule?.percentage || 0;

                return (
                  <div key={key} className="bg-slate-900 p-6 rounded-lg border border-slate-700">
                    <label className="block text-sm font-semibold text-slate-300 mb-3">
                      {position} Position
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="0"
                        step="0.1"
                        min="0"
                        max="100"
                        value={percentage}
                        onChange={(e) => {
                          const newPercentage = parseFloat(e.target.value) || 0;
                          let newRules = [...(settings.commissionRules || [])];

                          const existingIndex = newRules.findIndex(
                            (r: any) => (r.position || '').toLowerCase() === position.toLowerCase()
                          );

                          if (existingIndex >= 0) {
                            newRules[existingIndex].percentage = newPercentage;
                          } else {
                            newRules = [...newRules, { position, percentage: newPercentage }];
                          }

                          setSettings({ ...settings, commissionRules: newRules });
                        }}
                        className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white text-lg font-semibold focus:ring-2 focus:ring-blue-500 transition"
                      />
                      <span className="text-white text-lg font-semibold">%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Save and Recalculate Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:bg-slate-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
            >
              {isSaving ? <Loader size={20} className="animate-spin" /> : <Save size={20} />}
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
