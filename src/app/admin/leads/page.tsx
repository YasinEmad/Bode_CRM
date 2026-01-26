'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { Plus, Loader, Trash2, Users, Edit2, X } from 'lucide-react';
import LeadCard from '@/components/LeadCard';
import BulkImportComponent from '@/components/BulkImportComponent';

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Manage Leads</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            <Plus size={20} />
            Add Lead
          </button>
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
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 border-2 border-blue-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Lead</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Lead Name *</label>
                  <input
                    type="text"
                    placeholder="Enter lead name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone *</label>
                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Budget *</label>
                  <input
                    type="number"
                    placeholder="Enter budget amount"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 bg-white"
                  >
                    <option value="new">New</option>
                    <option value="connected">Connected</option>
                    <option value="negotiation">Negotiation</option>
                    <option value="closed">Closed</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Source</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 bg-white"
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
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Assign to Employee</label>
                  <select
                    value={formData.assignedTo}
                    onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 bg-white"
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                <textarea
                  placeholder="Enter notes about the lead"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 bg-white"
                  rows={3}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  Create Lead
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-semibold transition"
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
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">No leads yet. Create one or import from Excel to get started!</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Bulk Action Bar */}
            {selectedLeads.size > 0 && (
              <div className="bg-blue-50 border-b border-blue-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users size={20} className="text-blue-600" />
                  <span className="font-semibold text-gray-800">
                    {selectedLeads.size} lead{selectedLeads.size > 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={bulkAssignEmployee}
                    onChange={(e) => setBulkAssignEmployee(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
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
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium transition"
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
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedLeads.size === leads.length && leads.length > 0}
                        onChange={handleSelectAll}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Phone</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Budget</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Source</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Assigned To</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Notes</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr
                      key={lead._id}
                      className={`border-b hover:bg-blue-50 transition ${
                        selectedLeads.has(lead._id) ? 'bg-blue-100' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedLeads.has(lead._id)}
                          onChange={() => handleToggleLead(lead._id)}
                          className="w-5 h-5 text-blue-600 rounded"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">{lead.name}</td>
                      <td className="px-4 py-3 text-gray-600">{lead.phone}</td>
                      <td className="px-4 py-3 text-gray-600 font-semibold">${lead.budget.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                          lead.status === 'connected' ? 'bg-green-100 text-green-800' :
                          lead.status === 'negotiation' ? 'bg-yellow-100 text-yellow-800' :
                          lead.status === 'closed' ? 'bg-purple-100 text-purple-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{lead.source}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {lead.assignedTo ? (
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            {lead.assignedTo.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm max-w-xs truncate">{lead.notes}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleEditLead(lead)}
                            className="p-2.5 bg-blue-100 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg transition duration-200 font-medium"
                            title="Edit lead"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => setDeletingLeadId(lead._id)}
                            className="p-2.5 bg-red-100 hover:bg-red-600 text-red-600 hover:text-white rounded-lg transition duration-200 font-medium"
                            title="Delete lead"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Lead Modal */}
        {editingLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-blue-100">
                <h2 className="text-2xl font-bold text-gray-800">Edit Lead</h2>
                <button
                  onClick={() => setEditingLead(null)}
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-lg transition"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Lead Name *</label>
                    <input
                      type="text"
                      placeholder="Enter lead name"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Phone *</label>
                    <input
                      type="tel"
                      placeholder="Enter phone number"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Budget *</label>
                    <input
                      type="number"
                      placeholder="Enter budget amount"
                      value={editFormData.budget}
                      onChange={(e) => setEditFormData({ ...editFormData, budget: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 bg-white"
                    >
                      <option value="new">New</option>
                      <option value="connected">Connected</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="closed">Closed</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Source</label>
                    <select
                      value={editFormData.source}
                      onChange={(e) => setEditFormData({ ...editFormData, source: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 bg-white"
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
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Assign to Employee</label>
                    <select
                      value={editFormData.assignedTo}
                      onChange={(e) => setEditFormData({ ...editFormData, assignedTo: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 bg-white"
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
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
                  <textarea
                    placeholder="Enter notes about the lead"
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800 bg-white"
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex gap-3 p-6 border-t bg-gray-50">
                <button
                  onClick={() => setEditingLead(null)}
                  className="flex-1 px-4 py-3 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditSubmit}
                  disabled={isEditSubmitting}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full border-l-4 border-red-600">
              <div className="p-6 bg-red-50 border-b border-red-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <Trash2 size={24} className="text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-red-800">Delete Lead?</h2>
                </div>
                <p className="text-red-700 text-sm leading-relaxed">
                  This action cannot be undone. The lead will be permanently removed from the database.
                </p>
              </div>

              <div className="flex gap-3 p-6 bg-white">
                <button
                  onClick={() => setDeletingLeadId(null)}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition duration-200"
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
