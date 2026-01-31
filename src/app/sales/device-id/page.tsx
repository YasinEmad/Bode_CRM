'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Loader, Copy, RefreshCw, Smartphone, AlertCircle } from 'lucide-react';
import { generateDeviceId, resetDeviceId } from '@/lib/deviceId';

export default function MyDeviceIdPage() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [deviceId, setDeviceId] = useState<string>('');
  const [copying, setCopying] = useState(false);

  // Check authentication
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Generate current device ID and register automatically
  useEffect(() => {
    if (user && token) {
      const currentDeviceId = generateDeviceId();
      setDeviceId(currentDeviceId);
      // Auto-register device in the background
      autoRegisterDevice(currentDeviceId);
    }
  }, [user, token]);

  const autoRegisterDevice = async (deviceIdToRegister: string) => {
    try {
      console.log('[autoRegisterDevice] Starting registration for:', deviceIdToRegister.substring(0, 20) + '...');
      
      const response = await fetch('/api/auth/register-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          deviceId: deviceIdToRegister,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[autoRegisterDevice] Registration failed:', errorData);
        addToast(`❌ Failed to register device: ${errorData.error || 'Unknown error'}`, 'error');
        return;
      }

      const data = await response.json();
      console.log('[autoRegisterDevice] ✅ Registration successful:', data);
      console.log('[autoRegisterDevice] Device registered in backend:', data.user?.deviceId?.substring(0, 20) + '...');
      addToast('✅ Device registered successfully!', 'success');
    } catch (error) {
      console.error('[autoRegisterDevice] Error:', error);
      addToast('Failed to register device', 'error');
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
    resetDeviceId();
    const newDeviceId = generateDeviceId();
    setDeviceId(newDeviceId);
    addToast('✅ Device ID refreshed! This new ID will be automatically registered.', 'success');
    // Auto-register the new device ID
    autoRegisterDevice(newDeviceId);
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
              <p className="text-slate-400">Your unique device identifier</p>
            </div>
          </div>
        </div>

        {/* Current Device ID Card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-8 border border-slate-700 mb-8">
          <h2 className="text-xl font-bold text-white mb-6">Your Device ID</h2>

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
            This Device ID is automatically generated from your device's unique characteristics (screen resolution, 
            language, timezone, etc).
          </p>

          <button
            onClick={handleRefreshDeviceId}
            className="flex items-center gap-2 bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-slate-100 px-6 py-3 rounded-lg font-semibold transition-all"
          >
            <RefreshCw size={18} />
            Refresh ID
          </button>
        </div>

        {/* Information Notice */}
        <div className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 rounded-2xl shadow-xl p-8 border border-blue-700 mb-8">
          <div className="flex items-start gap-4">
            <AlertCircle className="text-blue-400 flex-shrink-0 mt-1" size={28} />
            <div>
              <h2 className="text-xl font-bold text-blue-200 mb-4">Device ID Registered</h2>
              <p className="text-blue-300 text-sm leading-relaxed">
                Your device ID is automatically registered in the system. Copy your device ID below and send it to your administrator so they can add it to your employee record for attendance verification.
              </p>
            </div>
          </div>
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
            <h3 className="text-lg font-bold text-white mb-4">New Device?</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              If you're using a new device or got a new phone, the Device ID will change automatically. Just copy the new ID and send it to your administrator for registration.
            </p>
          </div>

          {/* Need Help */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700">
            <h3 className="text-lg font-bold text-white mb-4">Need Help?</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              If you're having issues or have questions about your Device ID, contact your administrator. They can verify your 
              device or help reset it if needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
