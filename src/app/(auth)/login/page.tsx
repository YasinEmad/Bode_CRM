'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/Toast';
import { Loader, ArrowRight } from 'lucide-react';
import Lottie from 'lottie-react';

export default function LoginPage() {
  const router = useRouter();
  const { addToast, updateToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    // fetch animation from public folder (file name: "Bode login.json")
    fetch('/Bode%20login.json')
      .then((r) => r.json())
      .then(setAnimationData)
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const toastId = addToast('Logging in...', 'loading');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await res.json();
      
      // Store token in localStorage
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      localStorage.setItem('user', JSON.stringify(data.user));
      
      updateToast(toastId, 'Login successful!', 'success');
      
      // Redirect to appropriate dashboard based on role
      const redirectPath = data.user.role === 'admin' ? '/admin/dashboard' : '/sales/dashboard';
      router.push(redirectPath);
    } catch (error) {
      updateToast(toastId, error instanceof Error ? error.message : 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 to-purple-600/5 via-transparent"></div>
      <div className="absolute top-0 left-1/2 w-96 h-96 bg-indigo-600/10 rounded-full filter blur-3xl opacity-20 -translate-x-1/2 -translate-y-1/2"></div>

      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left Side - Animation */}
        <div className="flex items-center justify-center p-4">
          {animationData ? (
            <div className="w-64 h-64 md:w-96 md:h-96">
              <Lottie animationData={animationData} loop={true} />
            </div>
          ) : (
            <div className="w-64 h-64 md:w-80 md:h-80 bg-gradient-to-br from-slate-800/30 to-slate-700/20 rounded-2xl animate-pulse" />
          )}
        </div>

        {/* Right Side - Login Form */}
        <div className="relative mx-auto md:mx-0 w-full max-w-md">
          <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-8 w-full relative overflow-hidden">
            {/* Form header with logo */}
            <div className="mb-8">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                  <span className="font-bold text-white text-xl">BC</span>
                </div>
              </div>
              <h2 className="text-2xl text-white font-bold text-center">Welcome back</h2>
              <p className="text-center text-slate-300 text-sm mt-2">Sign in to your account</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-700 bg-slate-900/50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-100 placeholder-slate-500 transition-all"
                  placeholder="your-username"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <div className="mb-2">
                  <label className="block text-sm font-semibold text-slate-200">Password</label>
                </div>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-700 bg-slate-900/50 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-100 placeholder-slate-500 transition-all"
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input 
                  type="checkbox" 
                  className="form-checkbox h-4 w-4 text-indigo-500 rounded border-slate-600 bg-slate-800 cursor-pointer"
                  disabled={loading}
                />
                <span>Remember me</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:from-gray-500 disabled:to-gray-600 text-white py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-indigo-500/50 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Social login removed: Google/GitHub buttons and divider hidden because not used */}

            {/* Help text */}
            <div className="mt-6 pt-6 border-t border-slate-700/50 text-center text-slate-400 text-sm">
              <p>Don't have an account?</p>
              <p className="mt-1">Contact your administrator for access</p>
            </div>
          </div>

          {/* Back to home link */}
          <div className="mt-6 text-center">
            <Link href="/" className="text-slate-400 hover:text-slate-300 text-sm transition-colors">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
