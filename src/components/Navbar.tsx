'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-bold">
            🏢 Bode CRM
          </Link>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className={`${menuOpen ? 'block' : 'hidden'} md:flex gap-6 items-center`}>
            {user && (
              <>
                <span className="text-sm">
                  {user.name} ({user.role})
                </span>
                {user.role === 'admin' && (
                  <>
                    <Link href="/admin/dashboard" className="hover:text-blue-200">
                      Dashboard
                    </Link>
                    <Link href="/admin/leads" className="hover:text-blue-200">
                      Leads
                    </Link>
                    <Link href="/admin/employees" className="hover:text-blue-200">
                      Employees
                    </Link>
                    <Link href="/admin/commissions" className="hover:text-blue-200">
                      Commissions
                    </Link>
                    <Link href="/admin/settings" className="hover:text-blue-200">
                      Settings
                    </Link>
                  </>
                )}
                {user.role === 'sales' && (
                  <>
                    <Link href="/sales/dashboard" className="hover:text-blue-200">
                      Dashboard
                    </Link>
                    <Link href="/sales/leads" className="hover:text-blue-200">
                      My Leads
                    </Link>
                    <Link href="/sales/attendance" className="hover:text-blue-200">
                      Attendance
                    </Link>
                  </>
                )}
                <button
                  onClick={() => {
                    logout();
                  }}
                  className="flex items-center gap-2 bg-red-500 hover:bg-red-600 px-3 py-2 rounded"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
