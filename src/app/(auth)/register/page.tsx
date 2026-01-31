'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';
import { Loader } from 'lucide-react';
import Lottie from 'lottie-react';

export default function RegisterPage() {
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    fetch('/Bode%20login.json')
      .then((r) => r.json())
      .then(setAnimationData)
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-black flex items-center justify-center p-6">
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div className="flex items-center justify-center p-4">
          {animationData ? (
            <div className="w-64 h-64 md:w-96 md:h-96">
              <Lottie animationData={animationData} loop={true} />
            </div>
          ) : (
            <div className="w-64 h-64 md:w-80 md:h-80 bg-slate-800/30 rounded-lg" />
          )}
        </div>

        <div className="relative mx-auto md:mx-0">
          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-2xl p-8 w-full max-w-md">
            <div className="mb-3 flex justify-center">
              <img src="/Off White.png" alt="Bode CRM" className="h-14" />
            </div>
            <h2 className="text-2xl text-slate-100 font-semibold text-center mb-2">Registration Disabled</h2>
            <p className="text-center text-slate-300 mb-6">Sign up has been disabled. Please ask an admin to create your account.</p>

            <div className="space-y-4">
              <div className="text-center text-slate-300">
                <p>Registration is not available.</p>
                <div className="mt-4">
                  <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
                    Go to Login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
