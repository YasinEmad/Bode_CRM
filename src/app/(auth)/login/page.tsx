'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';
import { Loader } from 'lucide-react';
import Lottie from 'lottie-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
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
      await login(formData.username, formData.password);
      updateToast(toastId, 'Login successful!', 'success');
      router.push('/');
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
              <img src="/Night_Blue-removebg-preview.png" alt="Bode CRM" className="h-14" />
            </div>
            <h2 className="text-2xl text-slate-100 font-semibold text-center mb-2">Welcome back</h2>
            <p className="text-center text-slate-300 mb-6">Sign in to continue to Bode CRM</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full mt-1 px-4 py-3 border border-slate-700 bg-slate-900/40 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-100 placeholder-slate-400"
                  placeholder="your-username"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full mt-1 px-4 py-3 border border-slate-700 bg-slate-900/40 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-100 placeholder-slate-400"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <div className="flex items-center justify-between mt-1">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" className="form-checkbox h-4 w-4 text-indigo-500 rounded" />
                  Remember me
                </label>
                <Link href="#" className="text-sm text-indigo-300 hover:underline">
                  Forgot?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                {loading && <Loader size={18} className="animate-spin" />}
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <p className="text-center text-slate-400 mt-6 text-sm">Or continue with</p>
            <div className="mt-3 flex gap-3 justify-center">
              <div className="px-4 py-2 bg-slate-700 rounded-md text-slate-200 text-sm">Google</div>
              <div className="px-4 py-2 bg-slate-700 rounded-md text-slate-200 text-sm">GitHub</div>
            </div>
          </div>

          <div className="mt-6 text-center text-slate-300">
            <span>If you don't have an account, contact your admin.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
