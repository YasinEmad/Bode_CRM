'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Home, ArrowRight } from 'lucide-react';

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const router = useRouter();

  const handleGoHome = () => router.push('/');
  const handlePrimary = () => router.push(user ? '/admin/dashboard' : '/login');
  const handleContactAdmin = () => (window.location.href = 'mailto:admin@yourcompany.com?subject=Access%20Request');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-lg w-full bg-slate-800/70 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 text-center shadow-2xl">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 mx-auto mb-6">
          <AlertTriangle size={36} className="text-white" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-2">Access Denied</h1>
        <p className="text-slate-300 mb-6">You don't have permission to view this page.</p>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <button
            onClick={handlePrimary}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
          >
            <ArrowRight size={16} /> {user ? 'Go to Dashboard' : 'Login'}
          </button>

          <button
            onClick={handleGoHome}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg border border-slate-600"
          >
            <Home size={16} /> Go Home
          </button>
        </div>

        <div className="mt-5 text-sm text-slate-400">
          <p>
            If you believe this is an error,{' '}
            <button onClick={handleContactAdmin} className="underline text-slate-200">contact your administrator</button>.
          </p>
        </div>
      </div>
    </div>
  );
}
