'use client';

import { useEffect } from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Force dark mode for auth pages
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    
    return () => {
      // Restore original state when leaving auth pages
      document.documentElement.classList.remove('dark');
    };
  }, []);

  return <>{children}</>;
}
