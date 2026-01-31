'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, MapPin, Save, ChevronDown, Map, Crosshair, BarChart3, ArrowRight } from 'lucide-react';
import { isValidCoordinate, formatAccuracy, ACCURACY_THRESHOLDS } from '@/lib/geolocation';
import { useGeolocation } from '@/hooks/useGeolocation';

interface SystemSettings {
  _id?: string;
  officeLatitude: number;
  officeLongitude: number;
  officeName: string;
  attendanceRadius: number;
  attendanceTime: string;
  allowedEarlyMinutes?: number;
  minGpsAccuracy?: number;
}

export default function AdminSettings() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast, updateToast } = useToast();
  const { getLocation } = useGeolocation();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLocating, setIsLocating] = useState(false); // To show loading state on the button

  // simple client-side validation helpers
  const validationErrors: string[] = [];
  if (settings) {
    if (!settings.officeName || settings.officeName.toString().trim() === '') {
      validationErrors.push('Office name is required');
    }
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!settings.attendanceTime || !timeRegex.test(settings.attendanceTime)) {
      validationErrors.push('Attendance time required (HH:mm)');
    }
    if (!settings.attendanceRadius || settings.attendanceRadius <= 0) {
      validationErrors.push('Attendance radius must be greater than 0');
    }
    if ((settings.allowedEarlyMinutes ?? 0) < 0) {
      validationErrors.push('Allowed early minutes must be 0 or more');
    }
    if ((settings.minGpsAccuracy ?? 100) <= 0 || (settings.minGpsAccuracy ?? 100) > 500) {
      validationErrors.push('GPS accuracy threshold must be between 1 and 500 meters');
    }
  }
  const isValid = validationErrors.length === 0;

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
      // Exclude deprecated commissionRules from settings payload
      const { commissionRules, ...settingsWithoutCommission } = settings as any;

      // Sanitize attendanceTime
      let attendanceTime = settings.attendanceTime;
      if (attendanceTime) {
        attendanceTime = attendanceTime.trim();
        const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(attendanceTime)) {
          throw new Error('Invalid time format. Use HH:mm');
        }
      }
      
      let allowedEarly = parseInt(String(settings.allowedEarlyMinutes ?? 60), 10);
      if (isNaN(allowedEarly) || allowedEarly < 0) allowedEarly = 60;

      const bodyToSend = { 
        ...settingsWithoutCommission,
        attendanceTime,
        allowedEarlyMinutes: allowedEarly,
      };

      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyToSend),
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

  // --- IMPROVED GEOLOCATION LOGIC ---
  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation) {
      addToast('Geolocation not supported by your browser', 'error');
      return;
    }

    setIsLocating(true);
    const toastId = addToast('Acquiring high-precision location...', 'loading');

    try {
      // استخدم الـ hook الموحد للحصول على الموقع
      // GPS only mode (بدون WiFi)
      const result = await getLocation({
        minAccuracyThreshold: 100, // GPS accuracy threshold
        requireHighAccuracy: true, // GPS فقط
        timeout: 60000, // 60 ثانية
        allowInvalidCoordinates: false,
      });

      if (settings) {
        setSettings({
          ...settings,
          officeLatitude: Number(result.latitude.toFixed(7)),
          officeLongitude: Number(result.longitude.toFixed(7)),
        });

        // Log accuracy for debugging
        console.log(`Location captured with accuracy: ${result.accuracy} meters`);
        console.log(`Accuracy level: ${formatAccuracy(result.accuracy)}`);

        let msg = `📍 Location updated! Accuracy: ${formatAccuracy(result.accuracy)}`;
        updateToast(toastId, msg, 'success');
      } else {
        updateToast(toastId, 'Settings not loaded', 'error');
      }
      setIsLocating(false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to get location';
      updateToast(toastId, `Error: ${errorMsg}`, 'error');
      setIsLocating(false);
    }
  };

  const openGoogleMaps = () => {
    if (settings?.officeLatitude && settings?.officeLongitude) {
      window.open(`https://www.google.com/maps?q=${settings.officeLatitude},${settings.officeLongitude}`, '_blank');
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
      <div className="min-h-screen bg-slate-900 p-8 text-center text-slate-400">
        Failed to load settings
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">System Settings</h1>
          <p className="text-slate-400">Configure office location and attendance</p>
        </div>

        <div className="space-y-8">
          {/* Office & Attendance Section */}
          <section className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl border border-slate-700 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-6 py-4"
              onClick={() => setOpenSection(openSection === 'office' ? null : 'office')}
            >
              <div className="flex items-center gap-3">
                <MapPin size={24} className="text-blue-400" />
                <div>
                  <h2 className="text-lg font-bold text-white">Office & Attendance</h2>
                  <p className="text-sm text-slate-400">Click to view and edit location</p>
                </div>
              </div>
              <ChevronDown className={`text-slate-300 transition-transform ${openSection === 'office' ? 'rotate-180' : ''}`} />
            </button>

            {openSection === 'office' && (
              <div className="px-6 pb-6 pt-0 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Office Name</label>
                    <input
                      type="text"
                      value={settings.officeName}
                      onChange={(e) => setSettings({ ...settings, officeName: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">Latitude</label>
                      <input
                        type="number"
                        step="0.0000001" // Increased precision step
                        value={settings.officeLatitude}
                        onChange={(e) =>
                          setSettings({ ...settings, officeLatitude: parseFloat(e.target.value) })
                        }
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">Longitude</label>
                      <input
                        type="number"
                        step="0.0000001" // Increased precision step
                        value={settings.officeLongitude}
                        onChange={(e) =>
                          setSettings({ ...settings, officeLongitude: parseFloat(e.target.value) })
                        }
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    {/* View on Map Button */}
                    <button 
                       onClick={openGoogleMaps}
                       title="Verify location on Google Maps"
                       className="absolute top-0 right-0 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-2"
                    >
                      <Map size={14} /> Check on Map
                    </button>
                  </div>

                  <button
                    onClick={handleGetCurrentLocation}
                    disabled={isLocating}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-70 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-lg"
                  >
                    {isLocating ? <Loader size={18} className="animate-spin" /> : <Crosshair size={18} />}
                    {isLocating ? 'Acquiring GPS Signal...' : 'Get Precise Current Location'}
                  </button>
                  <p className="text-xs text-slate-400 text-center">
                    * For best accuracy (~5-10m), use a mobile device with GPS enabled.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-700">
                   {/* ... Keep Attendance Settings as is ... */}
                   <h3 className="text-lg font-semibold text-white mb-4">Attendance Settings</h3>
                   <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">Attendance Time</label>
                      <input
                        type="time"
                        value={settings.attendanceTime}
                        onChange={(e) => setSettings({ ...settings, attendanceTime: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">Allowed Radius (meters)</label>
                      <input
                        type="number"
                        value={settings.attendanceRadius}
                        onChange={(e) => setSettings({ ...settings, attendanceRadius: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">Allowed Early Check-in (minutes)</label>
                      <input
                        type="number"
                        value={settings.allowedEarlyMinutes ?? 60}
                        onChange={(e) => setSettings({ ...settings, allowedEarlyMinutes: parseInt(e.target.value) })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-300 mb-2">Min GPS Accuracy (meters) *</label>
                      <p className="text-xs text-slate-400 mb-2">How accurate GPS must be. Lower = stricter. Default: 100m</p>
                      <input
                        type="number"
                        value={settings.minGpsAccuracy ?? 100}
                        onChange={(e) => setSettings({ ...settings, minGpsAccuracy: parseInt(e.target.value) })}
                        min="10"
                        max="500"
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                      />
                      <p className="text-xs text-slate-500 mt-1">Range: 10-500m</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* KPI Settings Section */}
          <section className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl border border-slate-700 overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-6 py-4"
              onClick={() => setOpenSection(openSection === 'kpi' ? null : 'kpi')}
            >
              <div className="flex items-center gap-3">
                <BarChart3 size={24} className="text-amber-400" />
                <div>
                  <h2 className="text-lg font-bold text-white">KPI Settings</h2>
                  <p className="text-sm text-slate-400">Configure KPI indicators and weights</p>
                </div>
              </div>
              <ChevronDown className={`text-slate-300 transition-transform ${openSection === 'kpi' ? 'rotate-180' : ''}`} />
            </button>

            {openSection === 'kpi' && (
              <div className="px-6 pb-6 pt-4 space-y-4">
                <p className="text-slate-300 text-sm mb-4">
                  Configure KPI targets and weights for employee evaluation. Set targets for Attendance, Deals, Calls, Meetings, and Assessments.
                </p>
                <button
                  onClick={() => router.push('/admin/settings/kpi')}
                  className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                  <BarChart3 size={20} />
                  Open KPI Settings Page
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </section>

          {/* ... Keep Devices & Commission Sections exactly as is ... */}
          {/* Employee Devices */}
          <section className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl border border-slate-700 overflow-hidden">
             {/* ... (Same as previous code) ... */}
              <button
              className="w-full flex items-center justify-between px-6 py-4"
              onClick={() => setOpenSection(openSection === 'devices' ? null : 'devices')}
            >
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">Employee Devices</h2>
              </div>
              <ChevronDown className={`text-slate-300 transition-transform ${openSection === 'devices' ? 'rotate-180' : ''}`} />
            </button>
            {openSection === 'devices' && (
              <div className="px-6 pb-6 pt-0">
                 {/* ... Table Code ... */}
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
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-md text-sm"
                                    >Save</button>
                                    <button
                                      onClick={() => { setEditingDeviceIdId(null); setDeviceIdEditValue(''); }}
                                      className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded-md text-sm"
                                    >Cancel</button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleEditDevice(emp)}
                                    className="bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded-md text-sm"
                                  >Edit</button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
            )}
          </section>

          {/* Commission Rules removed — deprecated in admin settings */}

          {/* Save Button */}
          <div className="space-y-3">
            {!isValid && (
              <div className="text-sm text-red-400 bg-slate-900/40 p-3 rounded-md">
                <strong className="font-semibold">Fix the following:</strong>
                <ul className="mt-2 list-disc list-inside">
                  {validationErrors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <button
                onClick={handleSave}
                disabled={isSaving || !isValid}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:bg-slate-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
              >
                {isSaving ? <Loader size={20} className="animate-spin" /> : <Save size={20} />}
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}