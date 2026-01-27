'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Plus, Loader, Trash2, Users, Edit2, X, Search, Filter, TrendingUp, Target, Download } from 'lucide-react';
import LeadCard from '@/components/LeadCard';
import BulkImportComponent from '@/components/BulkImportComponent';
import { exportLeadsToExcel } from '@/lib/exportExcel';

interface Lead {
  _id: string;
  name: string;
  budget: number;
  phone: string;
  status: 'new' | 'connected' | 'negotiation' | 'closed' | 'lost';
  source: string;
  notes: string;
  assignedTo?: { _id: string; name: string };
}

interface Employee {
  _id: string;
  name: string;
}

export default function AdminLeads() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast, updateToast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [bulkAssignEmployee, setBulkAssignEmployee] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [editFormData, setEditFormData] = useState({
    name: '',
    budget: '',
    phone: '',
    status: 'new' as 'new' | 'connected' | 'negotiation' | 'closed' | 'lost',
    source: 'other' as const,
    notes: '',
    assignedTo: '',
  });
  const [formData, setFormData] = useState({
    name: '',
    budget: '',
    phone: '',
    status: 'new' as 'new' | 'connected' | 'negotiation' | 'closed' | 'lost',
    source: 'other' as const,
    notes: '',
    assignedTo: '',
  });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (token) {
      fetchLeads();
      fetchEmployees();
    }
  }, [token]);

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setLeads(Array.isArray(data.leads) ? data.leads : []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      addToast('Failed to fetch leads', 'error');
    } finally {
      setLoadingLeads(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setEmployees(Array.isArray(data.employees) ? data.employees : []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = addToast('Creating lead...', 'loading');

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          budget: formData.budget ? parseInt(formData.budget) : 0,
        }),
      });

      if (!res.ok) throw new Error('Failed to create lead');

      const data = await res.json();
      setLeads([...leads, data.lead]);
      setFormData({ name: '', budget: '', phone: '', status: 'new', source: 'other', notes: '', assignedTo: '' });
      setShowForm(false);
      updateToast(toastId, 'Lead created successfully!', 'success');
    } catch (error) {
      updateToast(toastId, error instanceof Error ? error.message : 'Failed to create lead', 'error');
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update lead');

      const data = await res.json();
      setLeads(leads.map((l) => (l._id === leadId ? data.lead : l)));
      addToast('Lead updated successfully!', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to update lead', 'error');
    }
  };

  const handleNotesChange = async (leadId: string, notes: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes }),
      });

      if (!res.ok) throw new Error('Failed to update notes');

      const data = await res.json();
      setLeads(leads.map((l) => (l._id === leadId ? data.lead : l)));
      addToast('Notes updated!', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to update notes', 'error');
    }
  };

  const handleToggleLead = (leadId: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(leadId)) {
      newSelected.delete(leadId);
    } else {
      newSelected.add(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map((l) => l._id)));
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignEmployee) {
      addToast('Please select an employee to assign to', 'error');
      return;
    }

    if (selectedLeads.size === 0) {
      addToast('Please select at least one lead to assign', 'error');
      return;
    }

    setIsAssigning(true);
    const toastId = addToast(`Assigning ${selectedLeads.size} leads...`, 'loading');

    try {
      const res = await fetch('/api/leads/bulk-assign', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          leadIds: Array.from(selectedLeads),
          employeeId: bulkAssignEmployee,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign leads');

      updateToast(
        toastId,
        `✅ Successfully assigned ${data.modifiedCount} leads!`,
        'success'
      );

      // Update leads in state
      const selectedSet = selectedLeads;
      setLeads(
        leads.map((l) =>
          selectedSet.has(l._id)
            ? { ...l, assignedTo: { _id: bulkAssignEmployee, name: employees.find((e) => e._id === bulkAssignEmployee)?.name || '' } }
            : l
        )
      );

      // Clear selection
      setSelectedLeads(new Set());
      setBulkAssignEmployee('');
    } catch (error) {
      updateToast(
        toastId,
        error instanceof Error ? error.message : 'Failed to assign leads',
        'error'
      );
    } finally {
      setIsAssigning(false);
    }
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setEditFormData({
      name: lead.name,
      budget: lead.budget.toString(),
      phone: lead.phone,
      status: lead.status,
      source: lead.source as any,
      notes: lead.notes,
      assignedTo: lead.assignedTo?._id || '',
    });
  };

  const handleEditSubmit = async () => {
    if (!editingLead) return;

    if (!editFormData.name || !editFormData.budget || !editFormData.phone) {
      addToast('Please fill in all required fields', 'error');
      return;
    }

    setIsEditSubmitting(true);
    const toastId = addToast('Updating lead...', 'loading');

    try {
      const res = await fetch(`/api/leads/${editingLead._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editFormData.name,
          budget: parseInt(editFormData.budget),
          phone: editFormData.phone,
          status: editFormData.status,
          source: editFormData.source,
          notes: editFormData.notes,
          assignedTo: editFormData.assignedTo === '' ? null : editFormData.assignedTo,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update lead');

      setLeads(leads.map((l) => (l._id === editingLead._id ? data.lead : l)));
      updateToast(toastId, '✅ Lead updated successfully!', 'success');
      setEditingLead(null);
    } catch (error) {
      updateToast(
        toastId,
        error instanceof Error ? error.message : 'Failed to update lead',
        'error'
      );
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleExportToExcel = () => {
    if (leads.length === 0) {
      addToast('No leads to export', 'error');
      return;
    }

    const filteredLeads = leads.filter((lead) => {
      const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lead.phone.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
      const matchesSource = filterSource === 'all' || lead.source === filterSource;
      return matchesSearch && matchesStatus && matchesSource;
    });

    if (filteredLeads.length === 0) {
      addToast('No leads match the current filters', 'error');
      return;
    }

    const exportData = filteredLeads.map((lead) => ({
      'Lead Name': lead.name,
      'Budget': lead.budget,
      'Phone': lead.phone,
      'Status': lead.status,
      'Source': lead.source,
      'Assigned To': lead.assignedTo?.name || 'Unassigned',
      'Notes': lead.notes || '',
    }));

    exportLeadsToExcel(exportData, 'leads');
    addToast('✅ Leads exported successfully!', 'success');
  };

  const handleDeleteLead = async (leadId: string) => {
    const toastId = addToast('Deleting lead...', 'loading');

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete lead');

      setLeads(leads.filter((l) => l._id !== leadId));
      setDeletingLeadId(null);
      updateToast(toastId, '✅ Lead deleted successfully!', 'success');
    } catch (error) {
      updateToast(
        toastId,
        error instanceof Error ? error.message : 'Failed to delete lead',
        'error'
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  // Filter leads based on search and filters
  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lead.phone.includes(searchQuery) ||
                         lead.notes.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
    const matchesSource = filterSource === 'all' || lead.source === filterSource;
    return matchesSearch && matchesStatus && matchesSource;
  });

  // Calculate statistics
  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    connected: leads.filter(l => l.status === 'connected').length,
    negotiation: leads.filter(l => l.status === 'negotiation').length,
    closed: leads.filter(l => l.status === 'closed').length,
    totalBudget: leads.reduce((sum, l) => sum + l.budget, 0),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-5xl font-bold text-white mb-2">Manage Leads</h1>
              <p className="text-slate-400">Create, assign, and track leads across your pipeline</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleExportToExcel}
                disabled={leads.length === 0}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:from-slate-600 disabled:to-slate-600 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg hover:shadow-emerald-500/50"
              >
                <Download size={20} />
                Export to Excel
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg hover:shadow-blue-500/50"
              >
                <Plus size={20} />
                Add Lead
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Total Leads</p>
                  <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
                </div>
                <Target className="text-blue-400 opacity-70" size={28} />
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">New</p>
                  <p className="text-2xl font-bold text-blue-400 mt-1">{stats.new}</p>
                </div>
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400">✨</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Connected</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.connected}</p>
                </div>
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400">✓</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Negotiation</p>
                  <p className="text-2xl font-bold text-amber-400 mt-1">{stats.negotiation}</p>
                </div>
                <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center text-amber-400">💬</div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Closed</p>
                  <p className="text-2xl font-bold text-purple-400 mt-1">{stats.closed}</p>
                </div>
                <TrendingUp className="text-purple-400 opacity-70" size={28} />
              </div>
            </div>
          </div>
        </div>

        {/* Bulk Import Component */}
        {token && (
          <BulkImportComponent
            token={token}
            onImportSuccess={fetchLeads}
            employees={employees}
          />
        )}

        {/* Form */}
        {showForm && (
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-xl p-6 md:p-8 mb-8 border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Plus size={28} className="text-blue-400" />
              Create New Lead
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Lead Name *</label>
                  <input
                    type="text"
                    placeholder="Enter lead name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900 placeholder-slate-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Phone *</label>
                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900 placeholder-slate-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Budget *</label>
                  <input
                    type="number"
                    placeholder="Enter budget amount"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900 placeholder-slate-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900 transition"
                  >
                    <option value="new">✨ New</option>
                    <option value="connected">✓ Connected</option>
                    <option value="negotiation">💬 Negotiation</option>
                    <option value="closed">🎉 Closed</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Source</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value as any })}
                    className="w-full px-4 py-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900 transition"
                  >
                    <option value="website">Website</option>
                    <option value="referral">Referral</option>
                    <option value="phone">Phone</option>
                    <option value="email">Email</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="google ads">Google Ads</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Assign to Employee</label>
                  <select
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    className="w-full px-4 py-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900 transition"
                  >
                    <option value="">Select an employee...</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Notes</label>
                <textarea
                  placeholder="Enter notes about the lead"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900 placeholder-slate-500 transition"
                  rows={3}
                />
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-blue-500/50"
                >
                  <Plus size={20} />
                  Create Lead
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-semibold transition-all border border-slate-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Leads Table with Bulk Actions */}
        {loadingLeads ? (
          <div className="flex items-center justify-center py-12">
            <Loader size={32} className="animate-spin text-blue-600" />
          </div>
        ) : leads.length === 0 ? (
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-xl p-12 text-center border border-slate-700">
            <Target size={48} className="mx-auto text-slate-500 mb-4" />
            <p className="text-slate-300 text-lg">No leads yet. Create one or import from Excel to get started!</p>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-xl overflow-hidden border border-slate-700">
            {/* Search and Filter Bar */}
            <div className="p-6 border-b border-slate-700 bg-slate-800">
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search by name, phone, or notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300 block mb-2">Filter by Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    >
                      <option value="all">All Statuses</option>
                      <option value="new">✨ New</option>
                      <option value="connected">✓ Connected</option>
                      <option value="negotiation">💬 Negotiation</option>
                      <option value="closed">🎉 Closed</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-300 block mb-2">Filter by Source</label>
                    <select
                      value={filterSource}
                      onChange={(e) => setFilterSource(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    >
                      <option value="all">All Sources</option>
                      <option value="website">Website</option>
                      <option value="referral">Referral</option>
                      <option value="phone">Phone</option>
                      <option value="email">Email</option>
                      <option value="facebook">Facebook</option>
                      <option value="instagram">Instagram</option>
                      <option value="google ads">Google Ads</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Clear Filters */}
                {(searchQuery || filterStatus !== 'all' || filterSource !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterStatus('all');
                      setFilterSource('all');
                    }}
                    className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center gap-2 transition"
                  >
                    <X size={16} />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {/* Results Count */}
            <div className="px-6 py-3 bg-slate-700 text-slate-300 text-sm font-medium border-b border-slate-600">
              Showing {filteredLeads.length} of {leads.length} leads
            </div>
            {/* Bulk Action Bar */}
            {selectedLeads.size > 0 && (
              <div className="bg-blue-500/10 border-b border-blue-500/50 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users size={20} className="text-blue-400" />
                  <span className="font-semibold text-white">
                    {selectedLeads.size} lead{selectedLeads.size > 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={bulkAssignEmployee}
                    onChange={(e) => setBulkAssignEmployee(e.target.value)}
                    className="px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-slate-900 text-white placeholder-slate-500"
                  >
                    <option value="">Select employee...</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleBulkAssign}
                    disabled={isAssigning || !bulkAssignEmployee}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-6 py-2 rounded-lg font-medium transition"
                  >
                    {isAssigning ? (
                      <>
                        <Loader size={16} className="animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      'Assign'
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedLeads(new Set())}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-700 border-b border-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedLeads.size === filteredLeads.length && filteredLeads.length > 0}
                        onChange={() => {
                          if (selectedLeads.size === filteredLeads.length) {
                            setSelectedLeads(new Set());
                          } else {
                            setSelectedLeads(new Set(filteredLeads.map((l) => l._id)));
                          }
                        }}
                        className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-200">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-200">Phone</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-200">Budget</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-200">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-200">Source</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-200">Assigned To</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-200">Notes</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-200">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center">
                        <p className="text-slate-400">No leads match your filters</p>
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr
                        key={lead._id}
                        className={`border-b border-slate-700 hover:bg-slate-700/50 transition ${
                          selectedLeads.has(lead._id) ? 'bg-blue-500/20' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedLeads.has(lead._id)}
                            onChange={() => handleToggleLead(lead._id)}
                            className="w-5 h-5 text-blue-600 rounded cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-white">{lead.name}</td>
                        <td className="px-4 py-3 text-slate-300">{lead.phone}</td>
                        <td className="px-4 py-3 text-emerald-400 font-semibold">${lead.budget.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                            lead.status === 'new' ? 'bg-blue-500/20 text-blue-300' :
                            lead.status === 'connected' ? 'bg-emerald-500/20 text-emerald-300' :
                            lead.status === 'negotiation' ? 'bg-amber-500/20 text-amber-300' :
                            lead.status === 'closed' ? 'bg-purple-500/20 text-purple-300' :
                            'bg-red-500/20 text-red-300'
                          }`}>
                            {lead.status === 'new' ? '✨' : lead.status === 'connected' ? '✓' : lead.status === 'negotiation' ? '💬' : lead.status === 'closed' ? '🎉' : '✗'} {lead.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-300 capitalize text-sm">{lead.source}</td>
                        <td className="px-4 py-3">
                          {lead.assignedTo ? (
                            <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-medium inline-block">
                              👤 {lead.assignedTo.name}
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs">Unassigned</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-sm max-w-xs truncate">{lead.notes}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleEditLead(lead)}
                              className="p-2.5 bg-blue-500/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg transition duration-200 font-medium"
                              title="Edit lead"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => setDeletingLeadId(lead._id)}
                              className="p-2.5 bg-red-500/20 hover:bg-red-600 text-red-400 hover:text-white rounded-lg transition duration-200 font-medium"
                              title="Delete lead"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Lead Modal */}
        {editingLead && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-700">
              <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
                <h2 className="text-2xl font-bold text-white">Edit Lead</h2>
                <button
                  onClick={() => setEditingLead(null)}
                  className="text-slate-400 hover:text-white hover:bg-slate-700 p-2 rounded-lg transition"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Lead Name *</label>
                    <input
                      type="text"
                      placeholder="Enter lead name"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900 placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Phone *</label>
                    <input
                      type="tel"
                      placeholder="Enter phone number"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900 placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Budget *</label>
                    <input
                      type="number"
                      placeholder="Enter budget amount"
                      value={editFormData.budget}
                      onChange={(e) => setEditFormData({ ...editFormData, budget: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900 placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Status</label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900"
                    >
                      <option value="new">New</option>
                      <option value="connected">Connected</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="closed">Closed</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Source</label>
                    <select
                      value={editFormData.source}
                      onChange={(e) => setEditFormData({ ...editFormData, source: e.target.value as any })}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900"
                    >
                      <option value="website">Website</option>
                      <option value="referral">Referral</option>
                      <option value="phone">Phone</option>
                      <option value="email">Email</option>
                      <option value="facebook">Facebook</option>
                      <option value="instagram">Instagram</option>
                      <option value="google ads">Google Ads</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Assign to Employee</label>
                    <select
                      value={editFormData.assignedTo}
                      onChange={(e) => setEditFormData({ ...editFormData, assignedTo: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900"
                    >
                      <option value="">Unassigned</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Notes</label>
                  <textarea
                    placeholder="Enter notes about the lead"
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900 placeholder-slate-500"
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t border-slate-700 bg-slate-800">
                <button
                  onClick={() => setEditingLead(null)}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  disabled={isEditSubmitting}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition"
                >
                  {isEditSubmitting ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        {deletingLeadId && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-2xl max-w-sm w-full border-l-4 border-red-600">
              <div className="p-6 bg-red-500/10 border-b border-red-500/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                    <Trash2 size={24} className="text-red-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-red-300">Delete Lead?</h2>
                </div>
                <p className="text-red-200 text-sm leading-relaxed">
                  This action cannot be undone. The lead will be permanently removed from the database.
                </p>
              </div>

              <div className="flex gap-3 p-6 bg-slate-800">
                <button
                  onClick={() => setDeletingLeadId(null)}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition duration-200"
                >
                  Keep It
                </button>
                <button
                  onClick={() => {
                    if (deletingLeadId) {
                      handleDeleteLead(deletingLeadId);
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition duration-200"
                >
                  <Trash2 size={18} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
