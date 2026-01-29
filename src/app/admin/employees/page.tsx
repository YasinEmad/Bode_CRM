'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader, Edit2, Save, X, User, Mail, Phone, Briefcase, DollarSign, Target, CheckCircle, Download, Eye, EyeOff, MessageSquare } from 'lucide-react';
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

export default function AdminEmployees() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast, updateToast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingData, setLoadingData] = useState(true);
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

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (token) {
      fetchEmployees();
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
        position: editFormData.position,
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
        body: JSON.stringify(addFormData),
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
            <div className="flex gap-3">
              <button
              onClick={handleExportToExcel}
              disabled={employees.length === 0}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:from-slate-600 disabled:to-slate-600 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg hover:shadow-emerald-500/50"
            >
              <Download size={20} />
              Export to Excel
            </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg"
              >
                Add Employee
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
                  .map((rule, index) => (
                    <div key={index} className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 text-white text-center border border-blue-500 shadow-lg">
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
            {/* Table */}
            <div className="overflow-x-auto">
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
                              onClick={() => handleEditEmployee(emp)}
                              className="inline-block bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white p-2 rounded-lg transition-all"
                              title="Edit employee"
                            >
                              <Edit2 size={18} />
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
                    <select
                      value={editFormData.position}
                      onChange={(e) => setEditFormData({ ...editFormData, position: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900"
                    >
                      <option value="">Select Position</option>
                      {POSITION_CHOICES.map((pos) => (
                        <option key={pos} value={pos} className="capitalize">
                          {pos.charAt(0).toUpperCase() + pos.slice(1)}
                        </option>
                      ))}
                    </select>
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
                    <select
                      value={addFormData.position}
                      onChange={(e) => setAddFormData({ ...addFormData, position: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg text-white bg-slate-900"
                    >
                      <option value="">Select Position</option>
                      {POSITION_CHOICES.map((pos) => (
                        <option key={pos} value={pos} className="capitalize">
                          {pos.charAt(0).toUpperCase() + pos.slice(1)}
                        </option>
                      ))}
                    </select>
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
      </div>
    </div>
  );
}
