'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, Copy, RefreshCw, Smartphone, AlertCircle, CheckCircle } from 'lucide-react';
import { generateDeviceId } from '@/lib/deviceId';

export default function MyDeviceIdPage() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [deviceId, setDeviceId] = useState<string>('');
  const [savedDeviceId, setSavedDeviceId] = useState<string>('');
  const [loadingData, setLoadingData] = useState(true);
  const [copying, setCopying] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  // Check authentication
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Generate current device ID and fetch saved device ID
  useEffect(() => {
    if (user && token) {
      const currentDeviceId = generateDeviceId();
      setDeviceId(currentDeviceId);
      fetchSavedDeviceId();
    }
  }, [user, token]);

  const fetchSavedDeviceId = async () => {
    try {
      setLoadingData(true);
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      const savedId = data.user?.deviceId || '';
      setSavedDeviceId(savedId);
      setIsRegistered(!!savedId);
    } catch (error) {
      console.error('Error fetching device ID:', error);
      addToast('Error loading device information', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  const handleRegisterDevice = async () => {
    try {
      setLoadingData(true);
      const response = await fetch('/api/auth/register-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deviceId: deviceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register device');
      }

      setSavedDeviceId(deviceId);
      setIsRegistered(true);
      addToast('✅ Device registered successfully!', 'success');
    } catch (error) {
      console.error('Error registering device:', error);
      addToast(error instanceof Error ? error.message : 'Failed to register device', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  const handleCopyDeviceId = async () => {
    try {
      setCopying(true);
      await navigator.clipboard.writeText(deviceId);
      addToast('✅ Device ID copied to clipboard!', 'success');
    } catch (error) {
      addToast('Failed to copy Device ID', 'error');
    } finally {
      setCopying(false);
    }
  };

  const handleRefreshDeviceId = () => {
    const newDeviceId = generateDeviceId();
    setDeviceId(newDeviceId);
    addToast('Device ID refreshed (not saved yet)', 'warning');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-xl">
              <Smartphone className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-5xl font-bold text-white mb-1">My Device ID</h1>
              <p className="text-slate-400">Unique identifier for your device used in attendance check-ins</p>
            </div>
          </div>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-cyan-500" size={40} />
          </div>
        ) : (
          <>
            {/* Current Device ID Card */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-8 border border-slate-700 mb-8">
              <h2 className="text-xl font-bold text-white mb-6">Current Device ID</h2>

              <div className="bg-slate-900/50 rounded-xl p-6 mb-6 border border-slate-600">
                <p className="text-slate-400 text-sm mb-3 uppercase tracking-wide">Device Fingerprint</p>
                <div className="flex items-center gap-3">
                  <code className="flex-1 text-sm font-mono text-cyan-400 break-all bg-slate-800 p-4 rounded-lg">
                    {deviceId}
                  </code>
                  <button
                    onClick={handleCopyDeviceId}
                    disabled={copying}
                    className="flex-shrink-0 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-600 text-white p-3 rounded-lg transition-all"
                    title="Copy to clipboard"
                  >
                    <Copy size={20} />
                  </button>
                </div>
              </div>

              <p className="text-slate-400 text-sm mb-6">
                This Device ID is automatically generated from your device's unique characteristics and is used to 
                verify your identity during attendance check-ins. Each device will have a different ID.
              </p>

              <button
                onClick={handleRefreshDeviceId}
                className="flex items-center gap-2 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-slate-100 px-6 py-3 rounded-lg font-semibold transition-all"
              >
                <RefreshCw size={18} />
                Refresh ID
              </button>
            </div>

            {/* Registration Status */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-8 border border-slate-700 mb-8">
              <h2 className="text-xl font-bold text-white mb-6">Registration Status</h2>

              {isRegistered ? (
                <div className="bg-emerald-900/20 border border-emerald-700 rounded-lg p-6 flex items-start gap-4">
                  <CheckCircle className="text-emerald-500 flex-shrink-0 mt-1" size={24} />
                  <div>
                    <h3 className="text-emerald-200 font-semibold mb-2">Device Registered</h3>
                    <p className="text-emerald-300 text-sm mb-4">
                      Your device is registered and can be used for attendance check-ins.
                    </p>
                    <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700 mb-4">
                      <p className="text-slate-400 text-xs mb-2 uppercase tracking-wide">Registered Device ID</p>
                      <p className="text-emerald-400 font-mono text-sm break-all">{savedDeviceId}</p>
                    </div>
                    <p className="text-emerald-300 text-xs">
                      ✅ This device ID is saved in your account and will be verified during check-ins.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-6 flex items-start gap-4 mb-6">
                  <AlertCircle className="text-amber-500 flex-shrink-0 mt-1" size={24} />
                  <div className="flex-1">
                    <h3 className="text-amber-200 font-semibold mb-2">Device Not Registered</h3>
                    <p className="text-amber-300 text-sm mb-4">
                      Your device is not yet registered. Register it now to use it for attendance check-ins.
                    </p>
                    <button
                      onClick={handleRegisterDevice}
                      disabled={loadingData}
                      className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-600 text-white px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      {loadingData ? (
                        <>
                          <Loader size={18} className="animate-spin" />
                          Registering...
                        </>
                      ) : (
                        <>
                          <Smartphone size={18} />
                          Register This Device
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* About Device ID */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4">What is Device ID?</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Device ID is a unique fingerprint of your device generated from hardware specifications like screen 
                  resolution, language, and timezone. It's used to verify that attendance check-ins come from your registered device.
                </p>
              </div>

              {/* Why Register */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4">Why Register?</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Registering your device ensures that only authorized devices can check in for attendance. This provides 
                  security and prevents unauthorized check-ins from other devices.
                </p>
              </div>

              {/* Device Changed */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4">Device Changed?</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  If you're using a new device or the Device ID has changed, register the new device to continue using 
                  attendance check-ins. You can register multiple devices if needed.
                </p>
              </div>

              {/* Need Help */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700">
                <h3 className="text-lg font-bold text-white mb-4">Need Help?</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  If you're having issues with device registration, contact your administrator. They can help verify your 
                  device or reset your device ID if needed.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
