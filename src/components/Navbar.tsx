'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileDropdown, setMobileDropdown] = useState<string | null>(null);
  const pathname = usePathname() || '';

  const isAuthPage = pathname === '/login';

  const navLinks = user?.role === 'admin' 
    ? [
        { href: '/admin/dashboard', label: 'Dashboard' },
        { href: '/admin/leads', label: 'Leads' },
        { href: '/admin/employees', label: 'Employees' },
        { href: '/admin/attendance-records', label: 'Attendance' },
        { href: '/admin/commissions', label: 'Commissions' },
        { href: '/admin/settings', label: 'Settings' },
      ]
    : [
        { href: '/sales/dashboard', label: 'Dashboard' },
        { href: '/sales/leads', label: 'My Leads' },
        { href: '/sales/commissions', label: 'My Commissions' },
        { href: '/sales/attendance', label: 'Attendance' },
      ];

  if (isAuthPage) {
    return (
      <header className="bg-slate-900/40 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-center py-4">
          <Link href="/" className="flex items-center gap-3 text-2xl font-bold hover:opacity-90 transition">
            <img src="/Night_Blue-removebg-preview.png" alt="Bode CRM" className="h-10 w-auto" />
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
            <img src="/Night_Blue-removebg-preview.png" alt="Bode CRM" className="h-8 w-auto" />
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
                <button
                  onClick={() => {
                    logout();
                  }}
                  className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">Logout</span>
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
