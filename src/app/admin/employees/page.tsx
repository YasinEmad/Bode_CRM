'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader, Edit2, Save, X, User, Mail, Phone, Briefcase, DollarSign, Target, CheckCircle, Download, Eye, EyeOff, MessageSquare, Lock, Trash2, Smartphone } from 'lucide-react';
import { useToast } from '@/components/Toast';
import { exportEmployeesToExcel } from '@/lib/exportExcel';
import SendNoteModal from '@/components/SendNoteModal';

interface Employee {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  salary?: number;
  createdAt: string;
  leadsCount?: number;
  closedDealsCount?: number;
}

const POSITION_CHOICES = ['senior', 'team lead', 'fresh', 'mid'];

// Normalize position to ensure 'team lead' variants are stored consistently
const normalizePosition = (position: string): string => {
  const trimmed = position.trim().toLowerCase();
  // Match any variation of "team lead/leader" and normalize to "team lead"
  if (/^team[\s_\-]*(lead|leader)$/i.test(trimmed)) {
    return 'team lead';
  }
  return trimmed;
};

export default function AdminEmployees() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast, updateToast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState({ username: '', name: '', password: '', position: '', phone: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [commissionRules, setCommissionRules] = useState<Array<{ position: string; percentage: number }>>([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedEmployeeForNote, setSelectedEmployeeForNote] = useState<{ id: string; name: string } | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    salary: 0,
  });
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState<{ id: string; name: string } | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [createAdminForm, setCreateAdminForm] = useState({ username: '', name: '', password: '', email: '', phone: '' });
  const [showCreateAdminPassword, setShowCreateAdminPassword] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [showCustomPosition, setShowCustomPosition] = useState(false);
  const [showAddCustomPosition, setShowAddCustomPosition] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<{ id: string; name?: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (token) {
      fetchEmployees();
      fetchAdmins();
      fetchCommissionRules();
    }
  }, [token]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setEmployees(Array.isArray(data.employees) ? data.employees : []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      addToast('Failed to fetch employees', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  const fetchAdmins = async () => {
    try {
      setLoadingAdmins(true);
      const res = await fetch('/api/admin/admins-list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAdmins(Array.isArray(data.admins) ? data.admins : []);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const fetchCommissionRules = async () => {
    try {
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCommissionRules(data.settings?.commissionRules || []);
    } catch (error) {
      console.error('Error fetching commission rules:', error);
    }
  };

  const handleEditEmployee = (emp: Employee) => {
    setEditingId(emp._id);
    setEditFormData({
      name: emp.name,
      email: emp.email,
      phone: emp.phone || '',
      position: emp.position || '',
      salary: emp.salary || 0,
    });
  };

  const handleOpenNoteModal = (empId: string, empName: string) => {
    setSelectedEmployeeForNote({ id: empId, name: empName });
    setShowNoteModal(true);
  };

  const handleOpenResetPasswordModal = (empId: string, empName: string) => {
    setResetPasswordData({ id: empId, name: empName });
    setResetPasswordInput('');
    setShowResetPassword(false);
    setShowResetPasswordModal(true);
  };

  // Trigger delete confirmation modal
  const handleDeleteEmployee = (empId: string, empName?: string) => {
    if (!empId) return;
    setDeleteCandidate({ id: empId, name: empName });
  };

  const performDeleteEmployee = async () => {
    if (!deleteCandidate) return;
    const { id: empId, name: empName } = deleteCandidate;
    setDeleting(true);
    const toastId = addToast('Deleting employee...', 'loading');
    try {
      const res = await fetch(`/api/employees/${empId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete employee');
      }
      setEmployees((prev) => (prev || []).filter((e) => e._id !== empId));
      updateToast(toastId, `✅ ${empName || 'Employee'} deleted`, 'success');
      if (editingId === empId) setEditingId(null);
      setDeleteCandidate(null);
    } catch (error) {
      updateToast(toastId, error instanceof Error ? error.message : 'Failed to delete employee', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordInput) {
      addToast('Please enter a new password', 'error');
      return;
    }

    const pwd = String(resetPasswordInput);
    const strongPwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!strongPwdRegex.test(pwd)) {
      addToast('Password must be at least 8 characters and include uppercase, lowercase, number and special character', 'error');
      return;
    }

    if (!resetPasswordData) return;

    const toastId = addToast('Resetting password...', 'loading');
    try {
      const res = await fetch(`/api/employees/${resetPasswordData.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword: resetPasswordInput }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reset password');
      }

      updateToast(toastId, `✅ Password reset for ${resetPasswordData.name}!`, 'success');
      setShowResetPasswordModal(false);
      setResetPasswordData(null);
      setResetPasswordInput('');
    } catch (error) {
      updateToast(toastId, error instanceof Error ? error.message : 'Failed to reset password', 'error');
    }
  };

  const openAdminAuthModal = async () => {
    setShowAdminAuthModal(true);
    setAdminLoading(true);
    try {
      const res = await fetch('/api/admin/auth', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch admin info');
      }
      const data = await res.json();
      setAdminUsername(data.admin?.username || '');
      setAdminPassword('');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to load admin info', 'error');
      setShowAdminAuthModal(false);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleSaveAdminAuth = async () => {
    if (!adminUsername || adminUsername.trim().length < 3) {
      addToast('Username must be at least 3 characters', 'error');
      return;
    }

    if (adminPassword) {
      const pwd = String(adminPassword);
      const strongPwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
      if (!strongPwdRegex.test(pwd)) {
        addToast('Password must be at least 8 characters and include uppercase, lowercase, number and special character', 'error');
        return;
      }
    }

    setAdminSaving(true);
    const toastId = addToast('Saving admin credentials...', 'loading');
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: adminUsername, password: adminPassword || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update admin');
      }

      updateToast(toastId, '✅ Admin credentials updated!', 'success');
      setShowAdminAuthModal(false);
      setAdminPassword('');
    } catch (error) {
      updateToast(toastId, error instanceof Error ? error.message : 'Failed to update admin', 'error');
    } finally {
      setAdminSaving(false);
    }
  };

  const handleSaveEmployee = async (empId: string) => {
    if (!editFormData.name || !editFormData.email) {
      addToast('Name and email are required', 'error');
      return;
    }

    const toastId = addToast('Saving employee...', 'loading');
    try {
      const updatePayload = {
        name: editFormData.name,
        email: editFormData.email,
        phone: editFormData.phone,
        position: normalizePosition(editFormData.position),
        salary: Number(editFormData.salary) || 0,
      };

      const res = await fetch(`/api/employees/${empId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatePayload),
      });

      if (!res.ok) throw new Error('Failed to update employee');

      const data = await res.json();
      setEmployees(employees.map((e) => (e._id === empId ? data.employee : e)));
      updateToast(toastId, '✅ Employee updated successfully!', 'success');
      setEditingId(null);
    } catch (error) {
      updateToast(toastId, error instanceof Error ? error.message : 'Failed to update employee', 'error');
    }
  };

  const handleCreateEmployee = async () => {
    if (!addFormData.username || !addFormData.name || !addFormData.password) {
      addToast('Username, name and password are required', 'error');
      return;
    }

    const pwd = String(addFormData.password);
    const strongPwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!strongPwdRegex.test(pwd)) {
      addToast('Password must be at least 8 chars and include uppercase, lowercase, number and special char', 'error');
      return;
    }

    const toastId = addToast('Creating employee...', 'loading');
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...addFormData,
          position: normalizePosition(addFormData.position),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create employee');
      }

      const data = await res.json();
      setEmployees([...(employees || []), data.employee]);
      updateToast(toastId, 'Employee created successfully!', 'success');
      setShowAddModal(false);
      setAddFormData({ username: '', name: '', password: '', position: '', phone: '' });
    } catch (error) {
      updateToast(toastId, error instanceof Error ? error.message : 'Failed to create employee', 'error');
    }
  };

  const handleCreateAdmin = async () => {
    if (!createAdminForm.username || !createAdminForm.name || !createAdminForm.password) {
      addToast('Username, name and password are required', 'error');
      return;
    }

    const pwd = String(createAdminForm.password);
    const strongPwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!strongPwdRegex.test(pwd)) {
      addToast('Password must be at least 8 chars and include uppercase, lowercase, number and special char', 'error');
      return;
    }

    const toastId = addToast('Creating admin...', 'loading');
    setCreatingAdmin(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...createAdminForm }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create admin');
      }

      await res.json();
      updateToast(toastId, 'Admin created successfully!', 'success');
      setShowCreateAdminModal(false);
      setCreateAdminForm({ username: '', name: '', password: '', email: '', phone: '' });
    } catch (error) {
      updateToast(toastId, error instanceof Error ? error.message : 'Failed to create admin', 'error');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleExportToExcel = () => {
    if (employees.length === 0) {
      addToast('No employees to export', 'error');
      return;
    }

    const exportData = employees.map((emp) => {
      const conversionRate = emp.leadsCount && emp.leadsCount > 0 
        ? ((emp.closedDealsCount || 0) / emp.leadsCount * 100).toFixed(1)
        : '0';
      
      return {
        'Employee Name': emp.name,
        'Email': emp.email,
        'Phone': emp.phone || 'N/A',
        'Position': emp.position ? emp.position.charAt(0).toUpperCase() + emp.position.slice(1) : 'N/A',
        'Salary': emp.salary || 0,
        'Total Leads': emp.leadsCount || 0,
        'Closed Deals': emp.closedDealsCount || 0,
        'Conversion Rate': `${conversionRate}%`,
      };
    });

    exportEmployeesToExcel(exportData, 'employees');
    addToast('✅ Employees exported successfully!', 'success');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  const getCommissionPercentage = (position: string) => {
    return commissionRules.find(r => (r.position || '').toLowerCase() === position.toLowerCase())?.percentage || 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-5xl font-bold text-white mb-2">Sales Employees</h1>
              <p className="text-slate-400">Manage employee details, positions, and salaries</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
              onClick={handleExportToExcel}
              disabled={employees.length === 0}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:from-slate-600 disabled:to-slate-600 disabled:opacity-50 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-medium transition-all shadow-lg hover:shadow-emerald-500/50"
            >
              <Download size={20} />
              Export to Excel
            </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-medium transition-all shadow-lg"
              >
                Add Employee
              </button>
              <button
                onClick={() => setShowCreateAdminModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-700 hover:to-pink-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-medium transition-all shadow-lg"
              >
                Create Admin
              </button>
              <button
                onClick={() => openAdminAuthModal()}
                className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-medium transition-all shadow-lg"
              >
                Admin Authentication
              </button>
            </div>
          </div>
        </div>

        {/* Commission Rules Info */}
        {commissionRules.length > 0 && (
          <div className="mb-8 bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700">
            <h2 className="text-lg font-bold text-white mb-4">Commission Rules by Position</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {commissionRules && commissionRules.length > 0 ? (
                commissionRules
                  .filter(rule => rule.percentage > 0 && rule.position)
                  .map((rule) => (
                    <div key={rule.position} className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 text-white text-center border border-blue-500 shadow-lg">
                      <p className="text-sm font-medium text-blue-100 capitalize mb-2">{rule.position}</p>
                      <p className="text-3xl font-bold">{rule.percentage}%</p>
                      <p className="text-xs text-blue-200 mt-2">Commission Rate</p>
                    </div>
                  ))
              ) : (
                <div className="col-span-full text-center text-slate-400 py-4">No commission rules configured</div>
              )}
            </div>
          </div>
        )}

        {loadingData ? (
          <div className="flex items-center justify-center py-20">
            <Loader size={40} className="animate-spin text-blue-400" />
          </div>
        ) : employees.length === 0 ? (
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-16 text-center border border-slate-700">
            <p className="text-slate-300">No employees registered yet</p>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl border border-slate-700 overflow-hidden">
            {/* Mobile Cards (visible on small screens) */}
            <div className="block sm:hidden p-4 space-y-4">
              {employees.map((emp) => {
                if (!emp || !emp._id) return null;
                const commissionRate = getCommissionPercentage(emp.position || '');
                const conversionRate = emp.leadsCount && emp.leadsCount > 0
                  ? ((emp.closedDealsCount || 0) / emp.leadsCount * 100).toFixed(1)
                  : '0';

                return (
                  <div key={emp._id} className="bg-slate-900/40 border border-slate-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-white font-bold text-lg">{emp.name}</div>
                        <div className="text-slate-400 text-sm">{(emp as any).username || (emp as any).email || '—'}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-white font-semibold">${(emp.salary || 0).toLocaleString()}</div>
                        <div className="text-slate-400 text-sm">{emp.position || '—'}{commissionRate > 0 ? ` • ${commissionRate}%` : ''}</div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="text-xs text-slate-400">Leads
                        <div className="text-white font-semibold">{emp.leadsCount || 0}</div>
                      </div>
                      <div className="text-xs text-slate-400">Closed
                        <div className="text-white font-semibold">{emp.closedDealsCount || 0}</div>
                      </div>
                      <div className="text-xs text-slate-400">Conv.
                        <div className="text-white font-semibold">{conversionRate}%</div>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button onClick={() => handleOpenNoteModal(emp._id, emp.name)} className="flex-1 bg-green-600/90 text-white py-2 rounded-md text-sm">Note</button>
                      <button onClick={() => handleOpenResetPasswordModal(emp._id, emp.name)} className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white py-2 rounded-md text-sm flex items-center justify-center gap-2">
                        <Lock size={16} />
                        Reset
                      </button>
                      <button onClick={() => handleEditEmployee(emp)} className="flex-1 bg-amber-600/90 text-white py-2 rounded-md text-sm">Edit</button>
                      <button onClick={() => router.push(`/admin/employees/${emp._id}/devices`)} className="flex-1 bg-cyan-600/90 text-white py-2 rounded-md text-sm flex items-center justify-center gap-2">
                        <Smartphone size={16} /> Devices
                      </button>
                      <button onClick={() => setDeleteCandidate({ id: emp._id, name: emp.name })} className="flex-1 bg-rose-600/90 text-white py-2 rounded-md text-sm">Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Table (hidden on small screens) */}
            <div className="overflow-x-auto hidden sm:block">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-600">
                    <th className="px-6 py-4 text-left text-sm font-bold text-white">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-white">Username</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-white">Phone</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-white">Position</th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-white">Salary</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-white">Leads</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-white">Closed</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-white">Conv. Rate</th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-white">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp, idx) => {
                    const commissionRate = getCommissionPercentage(emp.position || '');
                    const conversionRate = emp.leadsCount && emp.leadsCount > 0 
                      ? ((emp.closedDealsCount || 0) / emp.leadsCount * 100).toFixed(1)
                      : '0';
                    // Skip if emp doesn't have _id
                    if (!emp || !emp._id) return null;
                    
                    return (
                      <tr
                        key={emp._id}
                        className={`border-b border-slate-600 hover:bg-slate-700/50 transition-colors ${
                          idx % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/10'
                        }`}
                      >
                        <td className="px-6 py-4 text-sm text-white font-semibold">{emp.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-400">{(emp as any).username || (emp as any).email || '—'}</td>
                        <td className="px-6 py-4 text-sm text-slate-400">{(emp as any).phone || '—'}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="inline-block">
                            <span className="text-white font-medium capitalize">{emp.position || '—'}</span>
                            {commissionRate > 0 && (
                              <span className="ml-2 text-emerald-400 text-xs font-semibold">({commissionRate}%)</span>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-white font-semibold">${(emp.salary || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm text-center">
                          <span className="inline-block bg-blue-500/20 text-blue-400 px-3 py-1 rounded-lg font-semibold">
                            {emp.leadsCount || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-center">
                          <span className="inline-block bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg font-semibold">
                            {emp.closedDealsCount || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-center">
                          <span className="inline-block bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-lg font-semibold">
                            {conversionRate}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleOpenNoteModal(emp._id, emp.name)}
                              className="inline-block bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white p-2 rounded-lg transition-all"
                              title="Send note"
                            >
                              <MessageSquare size={18} />
                            </button>
                            <button
                              onClick={() => handleOpenResetPasswordModal(emp._id, emp.name)}
                              className="inline-block bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white p-2 rounded-lg transition-all"
                              title="Reset password"
                            >
                              <Lock size={18} />
                            </button>
                            <button
                              onClick={() => handleEditEmployee(emp)}
                              className="inline-block bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white p-2 rounded-lg transition-all"
                              title="Edit employee"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => router.push(`/admin/employees/${emp._id}/devices`)}
                              className="inline-block bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white p-2 rounded-lg transition-all"
                              title="Manage devices"
                            >
                              <Smartphone size={18} />
                            </button>
                            <button
                              onClick={() => setDeleteCandidate({ id: emp._id, name: emp.name })}
                              className="inline-block bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white p-2 rounded-lg transition-all"
                              title="Delete employee"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer Stats */}
            <div className="bg-slate-900 border-t border-slate-600 px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-slate-400 text-sm">Total Employees</p>
                <p className="text-2xl font-bold text-white">{employees.length}</p>
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-sm">Total Leads</p>
                <p className="text-2xl font-bold text-blue-400">
                  {employees.reduce((sum, e) => sum + (e.leadsCount || 0), 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-sm">Total Closed</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {employees.reduce((sum, e) => sum + (e.closedDealsCount || 0), 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-sm">Avg. Conv. Rate</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {employees.length > 0
                    ? (
                        (employees.reduce((sum, e) => sum + (e.closedDealsCount || 0), 0) /
                          employees.reduce((sum, e) => sum + (e.leadsCount || 0), 0)) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Edit Employee Modal */}
        {editingId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-700">
              <div className="p-6 border-b border-slate-600">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-full p-2">
                      <Edit2 size={20} className="text-white" />
                    </div>
                    Edit Employee
                  </h2>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700 rounded-lg"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Full Name *</label>
                    <input
                      type="text"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900 placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Email *</label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900 placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900 placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Position</label>
                    {!showCustomPosition ? (
                      <div className="space-y-2">
                        <select
                          value={editFormData.position}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              setShowCustomPosition(true);
                              setEditFormData({ ...editFormData, position: '' });
                            } else {
                              setEditFormData({ ...editFormData, position: e.target.value });
                            }
                          }}
                          className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900"
                        >
                          <option value="">Select Position</option>
                          {POSITION_CHOICES.map((pos) => (
                            <option key={pos} value={pos} className="capitalize">
                              {pos.charAt(0).toUpperCase() + pos.slice(1)}
                            </option>
                          ))}
                          <option value="__custom__">+ Custom Position</option>
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editFormData.position}
                          onChange={(e) => setEditFormData({ ...editFormData, position: e.target.value })}
                          placeholder="Enter custom position"
                          className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900 placeholder-slate-500"
                        />
                        <button
                          onClick={() => setShowCustomPosition(false)}
                          className="text-xs text-slate-400 hover:text-slate-300 underline"
                        >
                          Back to list
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Monthly Salary ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={editFormData.salary || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, salary: e.target.value ? parseFloat(e.target.value) : 0 })}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900 placeholder-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-slate-600 bg-slate-900">
                <button
                  onClick={() => handleSaveEmployee(editingId)}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white py-2 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Save Changes
                </button>
                <button
                  onClick={() => editingId && setDeleteCandidate({ id: editingId, name: editFormData.name })}
                  className="flex-1 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white py-2 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} />
                  Delete Employee
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg font-semibold transition-all border border-slate-600 flex items-center justify-center gap-2"
                >
                  <X size={18} />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Employee Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-700">
              <div className="p-6 border-b border-slate-600 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Add Employee</h2>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-2">Close</button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Username *</label>
                    <input
                      type="text"
                      value={addFormData.username}
                      onChange={(e) => setAddFormData({ ...addFormData, username: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg text-white bg-slate-900 placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Full Name *</label>
                    <input
                      type="text"
                      value={addFormData.name}
                      onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg text-white bg-slate-900 placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={addFormData.password}
                        onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                        className="w-full pr-12 px-4 py-2 border border-slate-600 rounded-lg text-white bg-slate-900 placeholder-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-white"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Position</label>
                    {!showAddCustomPosition ? (
                      <div className="space-y-2">
                        <select
                          value={addFormData.position}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              setShowAddCustomPosition(true);
                              setAddFormData({ ...addFormData, position: '' });
                            } else {
                              setAddFormData({ ...addFormData, position: e.target.value });
                            }
                          }}
                          className="w-full px-4 py-2 border border-slate-600 rounded-lg text-white bg-slate-900"
                        >
                          <option value="">Select Position</option>
                          {POSITION_CHOICES.map((pos) => (
                            <option key={pos} value={pos} className="capitalize">
                              {pos.charAt(0).toUpperCase() + pos.slice(1)}
                            </option>
                          ))}
                          <option value="__custom__">+ Custom Position</option>
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={addFormData.position}
                          onChange={(e) => setAddFormData({ ...addFormData, position: e.target.value })}
                          placeholder="Enter custom position"
                          className="w-full px-4 py-2 border border-slate-600 rounded-lg text-white bg-slate-900 placeholder-slate-500"
                        />
                        <button
                          onClick={() => setShowAddCustomPosition(false)}
                          className="text-xs text-slate-400 hover:text-slate-300 underline"
                        >
                          Back to list
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={addFormData.phone}
                      onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg text-white bg-slate-900 placeholder-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-slate-600 bg-slate-900">
                <button
                  onClick={() => handleCreateEmployee()}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white py-2 px-4 rounded-lg font-semibold"
                >
                  Create Employee
                </button>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg font-semibold border border-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Authentication Modal */}
        {showCreateAdminModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-700">
              <div className="p-6 border-b border-slate-600 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Create Admin</h2>
                <button onClick={() => setShowCreateAdminModal(false)} className="text-slate-400 hover:text-white p-2">Close</button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Username *</label>
                    <input
                      type="text"
                      value={createAdminForm.username}
                      onChange={(e) => setCreateAdminForm({ ...createAdminForm, username: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg text-white bg-slate-900 placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Full Name *</label>
                    <input
                      type="text"
                      value={createAdminForm.name}
                      onChange={(e) => setCreateAdminForm({ ...createAdminForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg text-white bg-slate-900 placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Password *</label>
                    <div className="relative">
                      <input
                        type={showCreateAdminPassword ? 'text' : 'password'}
                        value={createAdminForm.password}
                        onChange={(e) => setCreateAdminForm({ ...createAdminForm, password: e.target.value })}
                        className="w-full pr-12 px-4 py-2 border border-slate-600 rounded-lg text-white bg-slate-900 placeholder-slate-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreateAdminPassword(!showCreateAdminPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-white"
                        aria-label={showCreateAdminPassword ? 'Hide password' : 'Show password'}
                      >
                        {showCreateAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={createAdminForm.email}
                      onChange={(e) => setCreateAdminForm({ ...createAdminForm, email: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg text-white bg-slate-900 placeholder-slate-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={createAdminForm.phone}
                      onChange={(e) => setCreateAdminForm({ ...createAdminForm, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg text-white bg-slate-900 placeholder-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-slate-600 bg-slate-900">
                <button
                  onClick={() => handleCreateAdmin()}
                  disabled={creatingAdmin}
                  className="flex-1 bg-gradient-to-r from-pink-600 to-pink-500 text-white py-2 px-4 rounded-lg font-semibold"
                >
                  {creatingAdmin ? <Loader size={18} className="animate-spin" /> : 'Create Admin'}
                </button>
                <button
                  onClick={() => setShowCreateAdminModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg font-semibold border border-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

{showAdminAuthModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-700">
              <div className="p-6 border-b border-slate-600">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-full p-2">
                      <Lock size={20} className="text-white" />
                    </div>
                    Admin Authentication
                  </h2>
                  <button
                    onClick={() => setShowAdminAuthModal(false)}
                    className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700 rounded-lg"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Admin Username *</label>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white bg-slate-900 placeholder-slate-500"
                    disabled={adminLoading || adminSaving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">New Password (leave blank to keep current)</label>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full pr-12 px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white bg-slate-900 placeholder-slate-500"
                      disabled={adminLoading || adminSaving}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-white"
                      aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                    >
                      {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Password must be at least 8 characters and include uppercase, lowercase, number and special character.</p>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-slate-600 bg-slate-900">
                <button
                  onClick={() => handleSaveAdminAuth()}
                  disabled={adminSaving || adminLoading}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-700 hover:to-violet-600 text-white py-2 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                >
                  {adminSaving ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
                  Save
                </button>
                <button
                  onClick={() => setShowAdminAuthModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg font-semibold transition-all border border-slate-600 flex items-center justify-center gap-2"
                >
                  <X size={18} />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admins Management Section */}
        <div className="mt-12">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-white mb-2">Admin Management</h2>
            <p className="text-slate-400">View and manage system administrators</p>
          </div>

          {loadingAdmins ? (
            <div className="flex items-center justify-center py-12">
              <Loader size={40} className="animate-spin text-blue-400" />
            </div>
          ) : admins.length === 0 ? (
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-12 text-center border border-slate-700">
              <p className="text-slate-300">No admins registered yet</p>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl border border-slate-700 overflow-hidden">
              {/* Mobile Cards */}
              <div className="block sm:hidden p-4 space-y-4">
                {admins.map((admin) => (
                  <div key={admin._id} className="bg-slate-900/40 border border-slate-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-white font-bold text-lg">{admin.name}</div>
                        <div className="text-slate-400 text-sm">@{admin.username}</div>
                      </div>
                      <span className="inline-block bg-pink-600/20 text-pink-300 px-3 py-1 rounded-full text-xs font-semibold">Admin</span>
                    </div>
                    {admin.createdBy && (
                      <div className="mb-3 text-xs text-slate-400">
                        Created by: <span className="text-slate-200 font-medium">{admin.createdBy.name}</span>
                      </div>
                    )}
                    {admin.createdBy === null && (
                      <div className="mb-3 text-xs text-emerald-400">
                        Root Admin (Protected)
                      </div>
                    )}
                    <div className="flex gap-2">
                      {user?.role === 'admin' && user.id === admin.createdBy?._id.toString() && (
                        <button
                          onClick={() => setDeleteCandidate({ id: admin._id, name: admin.name })}
                          className="flex-1 bg-rose-600/90 text-white py-2 rounded-md text-sm"
                        >
                          Delete
                        </button>
                      )}
                      {user?.role === 'admin' && !admin.createdBy && (
                        <span className="flex-1 text-xs text-slate-400 text-center py-2">Cannot delete root admin</span>
                      )}
                      {user?.role === 'admin' && admin.createdBy && user.id !== admin.createdBy._id.toString() && (
                        <span className="flex-1 text-xs text-slate-400 text-center py-2">Only creator can delete</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="overflow-x-auto hidden sm:block">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-600">
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">Name</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">Username</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">Email</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">Created By</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-white">Created At</th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-white">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((admin, idx) => (
                      <tr
                        key={admin._id}
                        className={`border-b border-slate-600 hover:bg-slate-700/50 transition-colors ${
                          idx % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/10'
                        }`}
                      >
                        <td className="px-6 py-4 text-sm text-white font-semibold">{admin.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-400">@{admin.username}</td>
                        <td className="px-6 py-4 text-sm text-slate-400">{admin.email || '—'}</td>
                        <td className="px-6 py-4 text-sm">
                          {admin.createdBy ? (
                            <div className="text-slate-300">
                              <div className="font-medium">{admin.createdBy.name}</div>
                              <div className="text-xs text-slate-500">@{admin.createdBy.username}</div>
                            </div>
                          ) : (
                            <span className="inline-block bg-emerald-600/20 text-emerald-300 px-3 py-1 rounded text-xs font-semibold">Root Admin</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {new Date(admin.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {user?.role === 'admin' && user.id === admin.createdBy?._id.toString() ? (
                            <button
                              onClick={() => setDeleteCandidate({ id: admin._id, name: admin.name })}
                              className="inline-block bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white p-2 rounded-lg transition-all"
                              title="Delete admin"
                            >
                              <Trash2 size={18} />
                            </button>
                          ) : admin.createdBy ? (
                            <span className="text-xs text-slate-400">Only creator</span>
                          ) : (
                            <span className="text-xs text-slate-400">Protected</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Send Note Modal */}
        {selectedEmployeeForNote && token && (
          <SendNoteModal
            isOpen={showNoteModal}
            onClose={() => {
              setShowNoteModal(false);
              setSelectedEmployeeForNote(null);
            }}
            receiverId={selectedEmployeeForNote.id}
            receiverName={selectedEmployeeForNote.name}
            token={token}
            onSuccess={() => {
              addToast('Note sent successfully!', 'success');
            }}
          />
        )}

        {/* Reset Password Modal */}
        {showResetPasswordModal && resetPasswordData && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-700">
              <div className="p-6 border-b border-slate-600">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-full p-2">
                      <Lock size={20} className="text-white" />
                    </div>
                    Reset Password
                  </h2>
                  <button
                    onClick={() => setShowResetPasswordModal(false)}
                    className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-700 rounded-lg"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-200">
                    <strong>Employee:</strong> {resetPasswordData.name}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">New Password *</label>
                  <div className="relative">
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      value={resetPasswordInput}
                      onChange={(e) => setResetPasswordInput(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full pr-12 px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-white bg-slate-900 placeholder-slate-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-white"
                      aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                    >
                      {showResetPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Password must be at least 8 characters and include uppercase, lowercase, number and special character.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-slate-600 bg-slate-900">
                <button
                  onClick={handleResetPassword}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white py-2 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                >
                  <Lock size={18} />
                  Reset Password
                </button>
                <button
                  onClick={() => setShowResetPasswordModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg font-semibold transition-all border border-slate-600 flex items-center justify-center gap-2"
                >
                  <X size={18} />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteCandidate && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700 overflow-hidden">
              <div className="p-6 flex items-start gap-4 border-b border-slate-600">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-rose-600/20 flex items-center justify-center">
                    <Trash2 size={20} className="text-rose-400" />
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-rose-300">Delete Employee</h2>
                  <p className="text-slate-400 text-sm mt-1">This action will permanently remove the employee and related assignments.</p>
                </div>
                <button
                  onClick={() => setDeleteCandidate(null)}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-slate-200">Are you sure you want to permanently delete <strong className="text-white">{deleteCandidate.name || 'this employee'}</strong>?</p>
                <div className="text-sm text-slate-400">This cannot be undone. All related assignments and records will be removed from the system immediately.</div>
                <div className="rounded-md bg-rose-900/10 border border-rose-800 p-3 text-sm text-rose-200">
                  <strong className="text-rose-200">Warning:</strong> Deleted users cannot be recovered.
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 p-6 border-t border-slate-600 bg-slate-900">
                <button
                  onClick={() => performDeleteEmployee()}
                  disabled={deleting}
                  className="w-full sm:w-auto flex-1 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white py-2 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                >
                  {deleting ? 'Deleting...' : (
                    <>
                      <Trash2 size={16} />
                      Delete Permanently
                    </>
                  )}
                </button>
                <button
                  onClick={() => setDeleteCandidate(null)}
                  disabled={deleting}
                  className="w-full sm:w-auto flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-4 rounded-lg font-semibold transition-all border border-slate-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
