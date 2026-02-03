'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { CheckCircle, XCircle, Loader, Clock, AlertCircle } from 'lucide-react';
import { exportCommissionsToExcel } from '@/lib/exportExcel';

interface Commission {
  _id: string;
  amount: number;
  percentage: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  dealId?: { _id?: string; clientName?: string; clientNumber?: string; developer?: string } | null;
  rejectionNote?: string;
  createdAt?: string;
  approvalDate?: string;
}

const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  pending: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    icon: <Clock size={20} className="text-yellow-600" />,
  },
  approved: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    icon: <CheckCircle size={20} className="text-green-600" />,
  },
  rejected: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    icon: <XCircle size={20} className="text-red-600" />,
  },
  paid: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    icon: <CheckCircle size={20} className="text-blue-600" />,
  },
};

export default function SalesCommissions() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showNoteModal, setShowNoteModal] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'sales')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (token) {
      fetchCommissions();
    }
  }, [token, filterStatus]);

  const fetchCommissions = async () => {
    try {
      const url = filterStatus 
        ? `/api/commissions?status=${filterStatus}`
        : '/api/commissions';
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCommissions(Array.isArray(data.commissions) ? data.commissions : []);
    } catch (error) {
      console.error('Error fetching commissions:', error);
      addToast('Failed to fetch commissions', 'error');
    } finally {
      setLoadingData(false);
    }
  };

  const handleExport = () => {
    if (!commissions || commissions.length === 0) {
      addToast('No commissions to export', 'warning');
      return;
    }

    const exportData = commissions.map((c) => ({
      'Client Name': (c.dealId as any)?.clientName || 'Unknown',
      'Developer': (c.dealId as any)?.developer || '—',
      'Commission Rate': `${c.percentage}%`,
      'Commission Amount': c.amount,
      'Status': c.status.charAt(0).toUpperCase() + c.status.slice(1),
      'Submitted': c.createdAt ? new Date(c.createdAt).toLocaleString() : '',
      'Approved Date': c.approvalDate ? new Date(c.approvalDate).toLocaleString() : '',
      'Rejection Note': c.rejectionNote || '',
    }));

    exportCommissionsToExcel(exportData);
  };

  const calculateTotals = () => {
    return {
      pendingCount: commissions.filter((c) => c.status === 'pending').length,
      approvedCount: commissions.filter((c) => c.status === 'approved').length,
      rejectedCount: commissions.filter((c) => c.status === 'rejected').length,
      paidCount: commissions.filter((c) => c.status === 'paid').length,
      paidAmount: commissions
        .filter((c) => c.status === 'paid')
        .reduce((sum, c) => sum + c.amount, 0),
    };
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">My Commissions</h1>
          <p className="text-slate-400">Track your approved, pending, and rejected commissions</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          <div className="bg-gradient-to-br from-amber-600 to-amber-700 rounded-2xl shadow-xl p-6 text-white hover:shadow-2xl transition-all border border-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-100 text-sm font-medium">Pending Deals</p>
                <p className="text-4xl font-bold mt-2">{totals.pendingCount}</p>
              </div>
              <Clock size={40} className="opacity-30" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl shadow-xl p-6 text-white hover:shadow-2xl transition-all border border-emerald-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Approved Deals</p>
                <p className="text-4xl font-bold mt-2">{totals.approvedCount}</p>
              </div>
              <CheckCircle size={40} className="opacity-30" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl shadow-xl p-6 text-white hover:shadow-2xl transition-all border border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Rejected Deals</p>
                <p className="text-4xl font-bold mt-2">{totals.rejectedCount}</p>
              </div>
              <XCircle size={40} className="opacity-30" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl shadow-xl p-6 text-white hover:shadow-2xl transition-all border border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Paid Deals</p>
                <p className="text-4xl font-bold mt-2">{totals.paidCount}</p>
              </div>
              <CheckCircle size={40} className="opacity-30" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl shadow-xl p-6 text-white hover:shadow-2xl transition-all border border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Commission Paid</p>
                <p className="text-3xl font-bold mt-2">${totals.paidAmount.toLocaleString()}</p>
              </div>
              <span className="text-5xl opacity-20">💰</span>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-8">
          <div className="flex gap-2 flex-wrap">
            {['', 'pending', 'approved', 'rejected', 'paid'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterStatus === status
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border border-blue-500'
                    : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600'
                }`}
              >
                {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'All'}
              </button>
            ))}
            <button
              onClick={handleExport}
              className="ml-2 px-4 py-2 rounded-lg font-medium transition-all bg-gradient-to-r from-green-600 to-emerald-600 text-white border border-emerald-500 hover:from-emerald-600 hover:to-green-600"
            >
              Export Excel
            </button>
          </div>
        </div>

        {/* Commissions List */}
        {loadingData ? (
          <div className="flex items-center justify-center py-20">
            <Loader size={40} className="animate-spin text-blue-400" />
          </div>
        ) : commissions.length === 0 ? (
          <div className="bg-slate-700 rounded-2xl shadow-xl p-16 text-center border border-slate-600">
            <p className="text-slate-300 text-lg">🤷 No commissions found</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {commissions.map((commission) => (
              <div
                key={commission._id}
                className={`bg-slate-800 rounded-2xl shadow-xl p-6 border-l-4 transition-all hover:shadow-2xl ${
                  commission.status === 'pending'
                    ? 'border-amber-500'
                    : commission.status === 'approved'
                    ? 'border-emerald-500'
                    : commission.status === 'rejected'
                    ? 'border-red-500'
                    : 'border-blue-500'
                } border border-slate-700`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-slate-400 font-medium">📋 Client Name</p>
                    <p className="text-lg font-semibold text-white mt-1">{(commission.dealId as any)?.clientName || 'Unknown'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400 font-medium">🏷️ Developer</p>
                    <p className="text-lg font-semibold text-blue-400 mt-1">{(commission.dealId as any)?.developer || '—'}</p>
                  </div>

                  <div>
                    <p className="text-sm text-slate-400 font-medium"> Commission Amount</p>
                    <p className="text-lg font-semibold text-emerald-400 mt-1">
                      ${commission.amount.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-700 pt-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`${statusColors[commission.status].bg} p-2 rounded-full`}>
                      {statusColors[commission.status].icon}
                    </div>
                    <div>
                      <p className={`font-semibold ${statusColors[commission.status].text}`}>
                        {commission.status.charAt(0).toUpperCase() + commission.status.slice(1)}
                      </p>
                      {commission.createdAt && (
                        <p className="text-xs text-slate-400">
                          Submitted: {new Date(commission.createdAt).toLocaleDateString('ar-EG')}
                        </p>
                      )}
                      {commission.approvalDate && (
                        <p className="text-xs text-slate-400">
                          Approved: {new Date(commission.approvalDate).toLocaleDateString('ar-EG')}
                        </p>
                      )}
                    </div>
                  </div>

                  {commission.status === 'rejected' && commission.rejectionNote && (
                    <button
                      onClick={() => setShowNoteModal(commission._id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium flex items-center justify-center md:justify-start gap-2"
                    >
                      <AlertCircle size={18} />
                      View Note
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rejection Note Modal */}
        {showNoteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
              <div className="p-6 border-b border-red-500 bg-gradient-to-r from-red-900 to-red-800">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <AlertCircle size={24} />
                  Rejection Note
                </h2>
              </div>

              <div className="p-6">
                <div className="mb-4 p-4 bg-red-900 bg-opacity-30 rounded-lg border border-red-700">
                  {commissions
                    .find((c) => c._id === showNoteModal)
                    ?.rejectionNote ? (
                    <p className="text-white whitespace-pre-wrap">
                      {commissions.find((c) => c._id === showNoteModal)?.rejectionNote}
                    </p>
                  ) : (
                    <p className="text-slate-400 italic">No note provided</p>
                  )}
                </div>

                <div className="mb-6 space-y-2">
                  <p className="text-sm text-slate-400">
                    Commission:{' '}
                    <span className="font-semibold text-emerald-400">
                      ${commissions
                        .find((c) => c._id === showNoteModal)
                        ?.amount.toLocaleString()}
                    </span>
                  </p>
                    <p className="text-sm text-slate-400">
                      Client:{' '}
                      <span className="font-semibold text-white">
                        {commissions.find((c) => c._id === showNoteModal)?.dealId?.clientName || 'Unknown'}
                      </span>
                    </p>
                </div>

                <button
                  onClick={() => setShowNoteModal(null)}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-2 rounded-lg font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
