'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, MapPin, Save } from 'lucide-react';

interface SystemSettings {
  _id?: string;
  officeLatitude: number;
  officeLongitude: number;
  officeName: string;
  attendanceRadius: number;
  commissionRules: Array<{ role: string; percentage: number }>;
}

export default function AdminSettings() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast, updateToast } = useToast();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (token) {
      fetchSettings();
    }
  }, [token]);

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
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
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

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      const toastId = addToast('Getting your location...', 'loading');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setSettings(
            settings
              ? {
                  ...settings,
                  officeLatitude: position.coords.latitude,
                  officeLongitude: position.coords.longitude,
                }
              : null
          );
          updateToast(toastId, 'Location updated!', 'success');
        },
        (error) => {
          updateToast(toastId, `Error: ${error.message}`, 'error');
        }
      );
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
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-600">Failed to load settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">System Settings</h1>

        <div className="bg-white rounded-lg shadow-md p-8 space-y-8">
          {/* Office Location */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={24} className="text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-800">Office Location</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Office Name</label>
                <input
                  type="text"
                  value={settings.officeName}
                  onChange={(e) => setSettings({ ...settings, officeName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={settings.officeLatitude}
                    onChange={(e) =>
                      setSettings({ ...settings, officeLatitude: parseFloat(e.target.value) })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={settings.officeLongitude}
                    onChange={(e) =>
                      setSettings({ ...settings, officeLongitude: parseFloat(e.target.value) })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={handleGetCurrentLocation}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <MapPin size={18} />
                Use Current Location
              </button>
            </div>
          </section>

          {/* Attendance Radius */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Attendance Settings</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed Radius (meters)
              </label>
              <input
                type="number"
                value={settings.attendanceRadius}
                onChange={(e) => setSettings({ ...settings, attendanceRadius: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-600 mt-2">
                Employees must be within this distance from office to mark attendance
              </p>
            </div>
          </section>

          {/* Commission Rules */}
          <section className="border-t pt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Commission Rules</h2>

            <div className="space-y-4">
              {settings.commissionRules.map((rule, index) => (
                <div key={index} className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Role"
                    value={rule.role}
                    onChange={(e) => {
                      const newRules = [...settings.commissionRules];
                      newRules[index].role = e.target.value;
                      setSettings({ ...settings, commissionRules: newRules });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="Percentage"
                    value={rule.percentage}
                    onChange={(e) => {
                      const newRules = [...settings.commissionRules];
                      newRules[index].percentage = parseFloat(e.target.value);
                      setSettings({ ...settings, commissionRules: newRules });
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}

              <button
                onClick={() => {
                  setSettings({
                    ...settings,
                    commissionRules: [...settings.commissionRules, { role: '', percentage: 0 }],
                  });
                }}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-lg font-medium"
              >
                Add Commission Rule
              </button>
            </div>
          </section>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader size={20} className="animate-spin" /> : <Save size={20} />}
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
