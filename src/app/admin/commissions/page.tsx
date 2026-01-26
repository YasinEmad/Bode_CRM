'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { CheckCircle, XCircle, Loader, Clock } from 'lucide-react';

interface Commission {
  _id: string;
  amount: number;
  percentage: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  dealId: { _id: string; name: string; budget: number };
  employeeId: { _id: string; name: string };
  rejectionReason?: string;
}

export default function AdminCommissions() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast, updateToast } = useToast();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
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

  const handleApprove = async (commissionId: string) => {
    const toastId = addToast('Approving commission...', 'loading');

    try {
      const res = await fetch(`/api/commissions/${commissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'approved' }),
      });

      if (!res.ok) throw new Error('Failed to approve commission');

      const data = await res.json();
      setCommissions(commissions.map((c) => (c._id === commissionId ? data.commission : c)));
      updateToast(toastId, 'Commission approved!', 'success');
    } catch (error) {
      updateToast(toastId, error instanceof Error ? error.message : 'Failed to approve', 'error');
    }
  };

  const handleReject = async (commissionId: string, reason: string) => {
    const toastId = addToast('Rejecting commission...', 'loading');

    try {
      const res = await fetch(`/api/commissions/${commissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'rejected', rejectionReason: reason }),
      });

      if (!res.ok) throw new Error('Failed to reject commission');

      const data = await res.json();
      setCommissions(commissions.map((c) => (c._id === commissionId ? data.commission : c)));
      updateToast(toastId, 'Commission rejected!', 'success');
      setRejectingId(null);
      setRejectReason('');
    } catch (error) {
      updateToast(toastId, error instanceof Error ? error.message : 'Failed to reject', 'error');
    }
  };

  const statusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      paid: 'bg-blue-100 text-blue-800',
    };
    return styles[status as keyof typeof styles] || styles.pending;
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">Commission Management</h1>
          
          {/* Filter */}
          <div className="flex gap-2">
            {['', 'pending', 'approved', 'rejected', 'paid'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Commissions Table */}
        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader size={32} className="animate-spin text-blue-600" />
          </div>
        ) : commissions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">No commissions to review</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {commissions.map((commission) => (
              <div
                key={commission._id}
                className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Deal</p>
                    <p className="text-lg font-semibold text-gray-800">{commission.dealId.name}</p>
                    <p className="text-sm text-gray-600">${commission.dealId.budget.toLocaleString()}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Employee</p>
                    <p className="text-lg font-semibold text-gray-800">{commission.employeeId.name}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Commission</p>
                    <p className="text-lg font-semibold text-green-600">
                      ${commission.amount.toLocaleString()} ({commission.percentage}%)
                    </p>
                  </div>

                  <div className="flex items-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadge(commission.status)}`}>
                      {commission.status}
                    </span>
                  </div>
                </div>

                {commission.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(commission._id)}
                      className="flex items-center gap-2 flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium"
                    >
                      <CheckCircle size={18} />
                      Approve
                    </button>
                    <button
                      onClick={() => setRejectingId(commission._id)}
                      className="flex items-center gap-2 flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium"
                    >
                      <XCircle size={18} />
                      Reject
                    </button>
                  </div>
                )}

                {commission.status === 'rejected' && commission.rejectionReason && (
                  <p className="text-sm text-red-600 mt-3">Reason: {commission.rejectionReason}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reject Commission Modal */}
        {rejectingId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">Reject Commission</h2>
                <p className="text-gray-600 text-sm mt-1">Please provide a reason for rejection</p>
              </div>

              <div className="p-6 space-y-4">
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Enter rejection reason..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-gray-800 bg-white"
                  rows={3}
                />

                <div className="flex gap-4">
                  <button
                    onClick={() => handleReject(rejectingId, rejectReason || 'Rejected by admin')}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition"
                  >
                    Confirm Rejection
                  </button>
                  <button
                    onClick={() => {
                      setRejectingId(null);
                      setRejectReason('');
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg font-semibold transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
