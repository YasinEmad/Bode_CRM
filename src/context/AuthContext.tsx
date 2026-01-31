'use client';

import { ReactNode, createContext, useState, useEffect, useCallback } from 'react';

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'sales';
  position?: string;
  teamId?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 3. عملية تسجيل الخروج (لازم تبلغ السيرفر يمسح الكوكي)
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('user');
    }
  }, []);

  // 1. وظيفة للتحقق من الجلسة عند فتح التطبيق
  const checkAuth = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      console.log('[checkAuth] Found token in localStorage, verifying...');
      
      // Set timeout لـ 3 seconds - أقصر من قبل
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      try {
        const res = await fetch('/api/auth/me', {
          headers: { 
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (res.ok) {
          const data = await res.json();
          console.log('[checkAuth] Session valid, user:', data.user.username);
          setUser(data.user);
          setToken(token);
        } else {
          console.log('[checkAuth] Session invalid, clearing...');
          setUser(null);
          setToken(null);
          localStorage.removeItem('token');
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('CheckAuth fetch error:', fetchError);
        // Don't clear token on error - just mark loading as done
        // User will be redirected if needed by protected routes
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            setUser(JSON.parse(userData));
            setToken(token);
          } catch {
            setUser(null);
            setToken(null);
          }
        }
      }
    } catch (error) {
      console.error('CheckAuth error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // 2. عملية تسجيل الدخول
  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await res.json();
      console.log('[AuthContext] Login successful, storing token...');
      
      // Store token in localStorage for persistence
      if (data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
      }
      
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      console.log('[AuthContext] Login complete');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}