'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    if (!token || !user) {
      // Not logged in, go to login
      router.push('/login');
    } else {
      // Logged in, parse user and redirect to appropriate dashboard
      try {
        const userData = JSON.parse(user);
        if (userData.role === 'admin') {
          router.push('/admin/dashboard');
        } else {
          router.push('/sales/dashboard');
        }
      } catch {
        // Invalid user data, go to login
        router.push('/login');
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-black">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
    </div>
  );
}
