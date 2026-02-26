'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const checkAndRedirect = () => {
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
          } else if (userData.role === 'media buyer') {
            router.push('/media-buyer');
          } else {
            router.push('/sales/dashboard');
          }
        } catch {
          // Invalid user data, go to login
          router.push('/login');
        }
      }
    };

    // Small delay to ensure localStorage is ready
    const timer = setTimeout(checkAndRedirect, 100);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-black">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
    </div>
  );
}
