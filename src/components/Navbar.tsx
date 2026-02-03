'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Menu, X, Mail } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import NotificationsBell from './NotificationsBell';

interface NavLink {
  href: string;
  label: string;
}

export default function Navbar() {
  const { user, logout, token } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileDropdown, setMobileDropdown] = useState<string | null>(null);
  const pathname = usePathname() || '';
  const [isTeamLeader, setIsTeamLeader] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const isAuthPage = pathname === '/login';
  const isAdminPage = pathname.startsWith('/admin');
  const isSalesPage = pathname.startsWith('/sales');
  const isHomePage = pathname === '/';

  // Check if user is team leader and fetch unread notes
  useEffect(() => {
    if (user?.role === 'sales' && token) {
      checkTeamLeaderStatus();
      fetchUnreadNotes();
      
      // Set up interval to check for unread notes every 30 seconds
      const interval = setInterval(fetchUnreadNotes, 30000);
      return () => clearInterval(interval);
    } else {
      setIsTeamLeader(false);
      setUnreadCount(0);
    }
  }, [user, token]);

  const checkTeamLeaderStatus = async () => {
    try {
      const res = await fetch('/api/teams/check-team-leader', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setIsTeamLeader(data.isTeamLeader || false);
    } catch (error) {
      console.error('Error checking team leader status:', error);
      setIsTeamLeader(false);
    }
  };

  const fetchUnreadNotes = async () => {
    try {
      const res = await fetch('/api/notes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const unread = data.notes?.filter((note: any) => !note.read).length || 0;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error fetching unread notes:', error);
    }
  };

  // Previously the navbar was hidden on admin and sales pages.
  // Keep it rendered so the global navbar is visible across all routes.

  // Simple navbar for home page
  if (isHomePage && !user) {
    return (
      <header className="border-b border-slate-800 backdrop-blur-sm bg-slate-900/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <img src="/Off White.png" alt="Bode CRM" className="h-10 w-auto" />
          </Link>
          <Link
            href="/login"
            className="text-slate-300 hover:text-white font-medium transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>
    );
  }

  const navLinks: NavLink[] = user?.role === 'admin' 
    ? [
        { href: '/admin/dashboard', label: 'Dashboard' },
        { href: '/admin/leads', label: 'Leads' },
        { href: '/admin/employees', label: 'Employees' },
        { href: '/admin/teams', label: 'Teams' },
        { href: '/admin/attendance-records', label: 'Attendance' },
        { href: '/admin/monthly-employee-report', label: 'Monthly Report' },
        { href: '/admin/team-leaders-monthly-report', label: 'Team Leaders' },
        { href: '/admin/commissions', label: 'Commissions' },
        { href: '/admin/settings', label: 'Settings' },
      ]
    : [
        { href: '/sales/dashboard', label: 'Dashboard' },
        { href: '/sales/leads', label: 'My Leads' },
        { href: '/sales/my-monthly-kpis', label: 'My KPIs' },
        { href: '/sales/device-id', label: 'Device ID' },
        ...(isTeamLeader ? [
          { href: '/sales/my-team', label: 'My Team' },
          { href: '/sales/team-report', label: 'Team Report' }
        ] : []),
        { href: '/sales/commissions', label: 'My Commissions' },
        { href: '/sales/attendance', label: 'Attendance' },
      ];

  if (isAuthPage) {
    return (
      <header className="bg-slate-900/40 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-center py-4">
          <Link href="/" className="flex items-center gap-3 text-2xl font-bold hover:opacity-90 transition">
            <img src="/Off White.png" alt="Bode CRM" className="h-10 w-auto" />
          </Link>
        </div>
      </header>
    );
  }

  return (
    <nav className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <img src="/Off White.png" alt="Bode CRM" className="h-8 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* User Info & Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {user && (
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs sm:text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-slate-400 capitalize">{user.role}</p>
                </div>
                {user.role === 'sales' && <NotificationsBell />}
                {user.role === 'sales' && (
                  <Link
                    href="/sales/notes"
                    className="relative p-2 rounded-lg transition-all"
                    title="Notes"
                  >
                    <div className="relative">
                      <Mail size={18} className="text-blue-400 hover:text-blue-300" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-3 -right-3 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse border-2 border-white text-xs">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </Link>
                )}
                <button
                  onClick={() => {
                    logout();
                  }}
                  className="p-2 rounded-lg transition-all"
                  title="Logout"
                >
                  <LogOut size={18} className="text-red-400 hover:text-red-300" />
                </button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2 hover:bg-slate-700 rounded-lg transition"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {menuOpen && (
          <div className="lg:hidden border-t border-slate-700 py-3 space-y-2">
            {user && (
              <div className="px-3 py-3 bg-slate-700 rounded-lg mb-3">
                <p className="font-medium text-sm">{user.name}</p>
                <p className="text-xs text-slate-300 capitalize mt-1">{user.role}</p>
              </div>
            )}

            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
              >
                {link.label}
              </Link>
            ))}

            {user && (
              <button
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-3 py-2 rounded-lg text-sm font-medium transition-all mt-3"
              >
                <LogOut size={16} />
                Logout
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
