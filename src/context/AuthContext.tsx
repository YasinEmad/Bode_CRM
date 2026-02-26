'use client';

import { ReactNode, createContext, useState, useEffect, useCallback } from 'react';

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'sales' | 'media buyer';
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
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        // Treat aborted requests as non-errors (expected on slow connections)
        if (fetchError.name === 'AbortError') {
          console.debug('[checkAuth] Request aborted (timeout)');
        } else {
          console.error('CheckAuth fetch error:', fetchError);
        }

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

  // Register service worker and subscribe to push notifications when user is present
  useEffect(() => {
    if (!user || !token) return;

    const urlBase64ToUint8Array = (base64String: string) => {
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    };

    const subscribe = async () => {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const registration = await navigator.serviceWorker.register('/sw.js');

        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          // send existing to server to update
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ subscription: existing }),
          });
          return;
        }

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
        if (!vapidKey) return;

        const sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ subscription: sub }),
        });
      } catch (e) {
        console.warn('Push subscribe failed', e);
      }
    };

    subscribe();
  }, [user, token]);

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