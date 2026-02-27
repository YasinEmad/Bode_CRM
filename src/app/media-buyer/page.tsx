'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader, Plus, X, Info } from 'lucide-react';
import { useToast } from '@/components/Toast';
import BulkImportComponent from '@/components/BulkImportComponent';

type LeadStatus = 'new' | 'connected' | 'negotiation' | 'pending_closed' | 'closed_pending_approval' | 'closed' | 'lost';

interface FormData {
  name: string;
  project: string;
  phone: string;
  email: string;
  status: LeadStatus;
  source: string;
  sourceText: string;
  notes: string;
}

export default function MediaBuyerPage() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast, updateToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    project: '',
    phone: '',
    email: '',
    status: 'new',
    source: 'other',
    sourceText: '',
    notes: '',
  });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'media buyer')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone) {
      addToast('Please fill in required fields (Name and Phone)', 'error');
      return;
    }

    if (formData.source === 'other' && !formData.sourceText.trim()) {
      addToast('Please provide a custom source when Source is "Other"', 'error');
      return;
    }

    setIsSubmitting(true);
    const toastId = addToast('Creating lead...', 'loading');

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create lead');
      }

      updateToast(toastId, '✅ Lead created successfully!', 'success');
      setShowForm(false);
      setFormData({
        name: '',
        project: '',
        phone: '',
        email: '',
        status: 'new',
        source: 'other',
        sourceText: '',
        notes: '',
      });
    } catch (error) {
      updateToast(toastId, error instanceof Error ? error.message : 'Failed to create lead', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };



          if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-black">
        <div className="text-white flex flex-col items-center gap-4">
          <Loader className="animate-spin" size={40} />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                Welcome, {user?.name}
              </h1>
              <p className="text-slate-400">Add new leads to the system</p>
            </div>

            {/* action buttons (manual add) */}
            <div className="flex w-full sm:w-auto">
              <button
                onClick={() => setShowForm(!showForm)}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg hover:shadow-blue-500/50 w-full sm:w-auto"
              >
                <Plus size={20} />
                {showForm ? 'Cancel' : 'Add Lead'}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Bulk Import */}
          {token && (
            <BulkImportComponent
              token={token}
              onImportSuccess={() => {
                addToast('✅ Leads imported successfully!', 'success');
              }}
              employees={[]}
            />
          )}

          {/* Add Lead Button (duplicate removed, group above) */}
          {/* no-op - actions moved to header for improved UI */}

          {/* Add Lead Form */}
          {showForm && (
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-2xl p-8 border border-slate-700 max-w-2xl mx-auto">
              {/* close icon */}
              <button
                onClick={() => setShowForm(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
              >
                <X size={20} />
              </button>
              <h2 className="text-2xl font-bold text-white mb-6">Add New Lead</h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name and Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900 placeholder-slate-500"
                      placeholder="Lead name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Phone *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900 placeholder-slate-500"
                      placeholder="Phone number"
                      required
                    />
                  </div>
                </div>

                {/* Email and Project */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900 placeholder-slate-500"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Project</label>
                    <input
                      type="text"
                      name="project"
                      value={formData.project}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900 placeholder-slate-500"
                      placeholder="Project name"
                    />
                  </div>
                </div>

                {/* Status and Source */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900"
                    >
                      <option value="new">New</option>
                      <option value="connected">Connected</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="pending_closed">Pending Closed</option>
                      <option value="closed_pending_approval">Closed Pending Approval</option>
                      <option value="closed">Closed</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Source</label>
                    <select
                      name="source"
                      value={formData.source}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900"
                    >
                      <option value="facebook">Facebook</option>
                      <option value="instagram">Instagram</option>
                      <option value="tiktok">TikTok</option>
                      <option value="website">Website</option>
                      <option value="referral">Referral</option>
                      <option value="call">Call</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Custom Source (if Other is selected) */}
                {formData.source === 'other' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">Custom Source *</label>
                    <input
                      type="text"
                      name="sourceText"
                      value={formData.sourceText}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900 placeholder-slate-500"
                      placeholder="Please specify the source"
                      required={formData.source === 'other'}
                    />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white bg-slate-900 placeholder-slate-500"
                    placeholder="Add any notes about this lead"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-600 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader size={18} className="animate-spin" />
                        Creating...
                      </>
                    ) : (
                      '✓ Create Lead'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-all border border-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 flex items-center justify-center gap-2">
            <Info className="text-slate-300" size={20} />
            <p className="text-slate-300 text-center">
              You can add leads manually or import via Excel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
