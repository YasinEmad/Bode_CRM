'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/Toast';
import { Loader } from 'lucide-react';
import Lottie from 'lottie-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const { addToast, updateToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'sales',
  });
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    fetch('/Bode%20login.json')
      .then((r) => r.json())
      .then(setAnimationData)
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const toastId = addToast('Creating account...', 'loading');

    try {
      await register(formData.email, formData.password, formData.name, formData.role);
      updateToast(toastId, 'Account created successfully!', 'success');
      router.push('/');
    } catch (error) {
      updateToast(toastId, error instanceof Error ? error.message : 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
            <h2 className="text-2xl text-slate-100 font-semibold text-center mb-2">Create your account</h2>
            <p className="text-center text-slate-300 mb-6">Quickly create an account for your team</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full mt-1 px-4 py-3 border border-slate-700 bg-slate-900/40 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-100 placeholder-slate-400"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full mt-1 px-4 py-3 border border-slate-700 bg-slate-900/40 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-100 placeholder-slate-400"
                  placeholder="you@example.com"
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
                  placeholder="Enter a strong password"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full mt-1 px-4 py-3 border border-slate-700 bg-slate-900/40 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-100"
                >
                  <option value="sales">Sales Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                {loading && <Loader size={18} className="animate-spin" />}
                {loading ? 'Creating Account...' : 'Register'}
              </button>
            </form>

            <p className="text-center text-slate-400 mt-6 text-sm">Already have an account?</p>
            <div className="mt-3 text-center">
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
                Login here
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
