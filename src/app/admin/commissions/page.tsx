'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/Toast';
import { CheckCircle, XCircle, Loader, Clock, X } from 'lucide-react';
import { exportCommissionsToExcel } from '@/lib/exportExcel';

interface Commission {
  _id: string;
  amount: number;
  percentage: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  dealId?: {
    _id?: string;
    clientName?: string;
    clientNumber?: string;
    developer?: string;
    attachments?: string[];
    info?: string;
    userId?: { _id?: string; name?: string };
  } | null;
  employeeId?: { _id: string; name: string } | null;
  rejectionReason?: string;
  createdAt?: string;
  approvalDate?: string;
}

export default function AdminCommissions() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const { addToast, updateToast } = useToast();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [proofCommission, setProofCommission] = useState<Commission | null>(null);
  const [selectedDealClosing, setSelectedDealClosing] = useState<any | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [approvalAmount, setApprovalAmount] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

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

  const handleExport = () => {
    if (!commissions || commissions.length === 0) {
      addToast('No commissions to export', 'warning');
      return;
    }

    const exportData = commissions.map((c) => ({
      'Client Name': (c.dealId as any)?.clientName || 'Unknown',
      'Developer': (c.dealId as any)?.developer || '—',
      'Commission Rate': `${c.percentage}%`,
      'Client Phone': (c.dealId as any)?.clientNumber || '—',
      'Employee': c.employeeId?.name || '—',
      'Commission Amount': c.amount,
      'Status': c.status.charAt(0).toUpperCase() + c.status.slice(1),
      'Submitted': c.createdAt ? new Date(c.createdAt).toLocaleString() : '',
      'Approved Date': c.approvalDate ? new Date(c.approvalDate).toLocaleString() : '',
      'Rejection Note': (c as any).rejectionNote || (c as any).rejectionReason || '',
    }));

    exportCommissionsToExcel(exportData, 'admin_commissions.xlsx');
  };

  const handleApprove = async (commissionId: string) => {
    const toastId = addToast('Approving commission...', 'loading');

    try {
      if (!approvalAmount || isNaN(Number(approvalAmount))) {
        throw new Error('Please enter a valid commission amount');
      }

      const res = await fetch(`/api/commissions/${commissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'approved', amount: Number(approvalAmount) }),
      });

      if (!res.ok) throw new Error('Failed to approve commission');

      const data = await res.json();
      setCommissions(commissions.map((c) => (c._id === commissionId ? data.commission : c)));
      setApprovingId(null);
      setApprovalAmount('');
      updateToast(toastId, 'Commission approved! Now waiting for payment.', 'success');
    } catch (error) {
      updateToast(toastId, error instanceof Error ? error.message : 'Failed to approve', 'error');
    }
  };

  const handlePay = async (commissionId: string) => {
    const toastId = addToast('Marking commission as paid...', 'loading');

    try {
      const res = await fetch(`/api/commissions/${commissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'paid' }),
      });

      if (!res.ok) throw new Error('Failed to mark commission as paid');

      const data = await res.json();
      setCommissions(commissions.map((c) => (c._id === commissionId ? data.commission : c)));
      updateToast(toastId, 'Commission marked as paid!', 'success');
    } catch (error) {
      updateToast(toastId, error instanceof Error ? error.message : 'Failed to mark as paid', 'error');
    }
  };

  const handleDelete = async (commissionId: string | null) => {
    if (!commissionId) return;

    const toastId = addToast('Deleting commission...', 'loading');

    try {
      const res = await fetch(`/api/commissions/${commissionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to delete commission');

      setCommissions((prev) => prev.filter((c) => c._id !== commissionId));
      updateToast(toastId, 'Commission deleted', 'success');
    } catch (error) {
      updateToast(toastId, error instanceof Error ? error.message : 'Failed to delete', 'error');
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleReject = async (commissionId: string, reason: string, note: string) => {
    const toastId = addToast('Rejecting commission...', 'loading');

    try {
      const res = await fetch(`/api/commissions/${commissionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'rejected', rejectionReason: reason, rejectionNote: note }),
      });

      if (!res.ok) throw new Error('Failed to reject commission');

      const data = await res.json();
      setCommissions(commissions.map((c) => (c._id === commissionId ? data.commission : c)));
      updateToast(toastId, 'Commission rejected!', 'success');
      setRejectingId(null);
      setRejectReason('');
      setRejectNote('');
    } catch (error) {
      updateToast(toastId, error instanceof Error ? error.message : 'Failed to reject', 'error');
    }
  };

  const statusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      approved: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      rejected: 'bg-red-500/20 text-red-400 border border-red-500/30',
      paid: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">Commission Management</h1>
          <p className="text-slate-400">Review and approve employee commissions</p>
          
          {/* Filter */}
          <div className="flex flex-wrap gap-2 mt-6">
            {['', 'pending', 'approved', 'rejected', 'paid'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filterStatus === status
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg'
                    : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
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
          <div className="flex items-center justify-center py-12">
            <Loader size={32} className="animate-spin text-blue-400" />
          </div>
        ) : commissions.length === 0 ? (
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-12 text-center border border-slate-700">
            <p className="text-slate-400 text-lg">No commissions to review</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {commissions.map((commission) => (
              <div
                key={commission._id}
                className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-xl p-6 border border-slate-700 hover:shadow-2xl transition-all"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">

                  <div>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Client Name</p>
                    <p className="text-lg font-bold text-white">{(commission.dealId as any)?.clientName || 'Unknown'}</p>
                  </div>

                  <div>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Developer</p>
                    <p className="text-lg font-bold text-blue-400">{(commission.dealId as any)?.developer || '—'}</p>
                  </div>

                  <div>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Employee</p>
                    <p className="text-lg font-bold text-white">{commission.employeeId && commission.employeeId.name ? commission.employeeId.name : 'Unknown'}</p>
                  </div>

                  <div>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Client Phone</p>
                    <p className="text-lg font-bold text-emerald-400">{(commission.dealId as any)?.clientNumber || '—'}</p>
                  </div>

                  <div>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Commission Amount</p>
                    <p className="text-lg font-bold text-emerald-400">${commission.amount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="border-t border-slate-600 pt-4 mb-4 flex flex-wrap justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-2 ${statusBadge(commission.status)}`}>
                      {commission.status === 'pending' && <Clock size={16} />}
                      {commission.status === 'approved' && <CheckCircle size={16} />}
                      {commission.status === 'rejected' && <XCircle size={16} />}
                      {commission.status === 'paid' && <CheckCircle size={16} />}
                      {commission.status.charAt(0).toUpperCase() + commission.status.slice(1)}
                    </span>
                    <div className="flex flex-col gap-1">
                      {commission.createdAt && (
                        <p className="text-xs text-slate-400">
                          Submitted: {new Date(commission.createdAt).toLocaleDateString()}
                        </p>
                      )}
                      {commission.approvalDate && (
                        <p className="text-xs text-slate-400">
                          Approved: {new Date(commission.approvalDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setProofCommission(commission)}
                      className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
                    >
                      Guide
                    </button>

                    <button
                      onClick={async () => {
                        try {
                          // commission.dealId can be an object or a string id
                          const dealIdValue = commission.dealId && typeof commission.dealId === 'object'
                            ? (commission.dealId as any)._id || (commission.dealId as any).toString()
                            : commission.dealId;

                          if (!dealIdValue) {
                            throw new Error('No dealId available');
                          }

                          const res = await fetch(`/api/deal-closing?dealId=${encodeURIComponent(String(dealIdValue))}`, {
                            headers: { Authorization: `Bearer ${token}` },
                          });

                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) {
                            console.error('deal-closing API error', data);
                            throw new Error(data.error || 'Failed to fetch deal details');
                          }

                          setSelectedDealClosing(data.dealClosing || null);
                        } catch (err) {
                          console.error('Failed to load deal details', err);
                          addToast?.('Failed to load deal details', 'error');
                        }
                      }}
                      className="ml-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium"
                    >
                      Details
                    </button>

                    {(commission.status === 'rejected' || commission.status === 'paid') && (
                      <button
                        onClick={() => setDeleteTargetId(commission._id)}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {commission.status === 'pending' && (
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => setApprovingId(commission._id)}
                      className="flex items-center gap-2 flex-1 min-w-40 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white py-2 px-4 rounded-lg font-medium transition-all"
                    >
                      <CheckCircle size={18} />
                      Approve
                    </button>
                    <button
                      onClick={() => setRejectingId(commission._id)}
                      className="flex items-center gap-2 flex-1 min-w-40 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white py-2 px-4 rounded-lg font-medium transition-all"
                    >
                      <XCircle size={18} />
                      Reject
                    </button>
                  </div>
                )}

                {commission.status === 'approved' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handlePay(commission._id)}
                      className="flex items-center gap-2 flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-2 px-4 rounded-lg font-medium transition-all"
                    >
                      <CheckCircle size={18} />
                      Mark as Paid
                    </button>
                  </div>
                )}

                {commission.status === 'rejected' && commission.rejectionReason && (
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-sm text-red-400"><strong>Rejection Reason:</strong> {commission.rejectionReason}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Reject Commission Modal */}
        {rejectingId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
              <div className="p-6 border-b border-slate-600">
                <h2 className="text-2xl font-bold text-white">Reject Commission</h2>
                <p className="text-slate-400 text-sm mt-1">Please provide details about the rejection</p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Note to Sales Employee</label>
                  <textarea
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="Message that will be sent to the employee..."
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-white bg-slate-900 placeholder-slate-500"
                    rows={3}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => handleReject(rejectingId, 'Rejected by admin', rejectNote)}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white py-2 rounded-lg font-semibold transition-all"
                  >
                    Confirm Rejection
                  </button>
                  <button
                    onClick={() => {
                      setRejectingId(null);
                      setRejectNote('');
                    }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-semibold transition-all border border-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Proof Modal for commission (view lead proofImage and notes) */}
        {proofCommission && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-700">
              <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-gradient-to-r from-indigo-600/20 to-purple-600/20">
                <h2 className="text-2xl font-bold text-white">Guide</h2>
                <button onClick={() => setProofCommission(null)} className="text-slate-400 hover:text-white p-2 rounded-lg"><X size={24} /></button>
              </div>

              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div className="w-full flex items-center justify-center">
                    {((proofCommission.dealId as any)?.proofImage && typeof (proofCommission.dealId as any).proofImage === 'string') || ((proofCommission.dealId as any)?.attachments && (proofCommission.dealId as any).attachments.length > 0) ? (
                      <img src={(proofCommission.dealId as any).proofImage ? (proofCommission.dealId as any).proofImage : (proofCommission.dealId as any).attachments[0]} alt="proof" className="w-full max-h-[60vh] object-contain rounded" />
                    ) : (
                      <div className="text-slate-400">No proof image provided</div>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Info</h3>
                    <div className="text-slate-200 whitespace-pre-wrap overflow-auto">{(proofCommission.dealId as any)?.info || 'No info provided'}</div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 p-6 border-t border-slate-700 bg-slate-800">
                {((proofCommission.dealId as any)?.proofImage && typeof (proofCommission.dealId as any).proofImage === 'string') || ((proofCommission.dealId as any)?.attachments && (proofCommission.dealId as any).attachments.length > 0) ? (
                  <a
                    href={(proofCommission.dealId as any).proofImage ? (proofCommission.dealId as any).proofImage : (proofCommission.dealId as any).attachments[0]}
                    download={`proof_${proofCommission._id}.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold flex items-center justify-center"
                  >
                    Download
                  </a>
                ) : (
                  <button disabled className="px-4 py-3 bg-slate-700/50 text-slate-400 rounded-lg font-semibold">No image</button>
                )}

                <button onClick={() => setProofCommission(null)} className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold">Close</button>

                {proofCommission.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        setApprovingId(proofCommission._id);
                        setProofCommission(null);
                      }}
                      className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                    >
                      Approve
                    </button>

                    <button
                      onClick={() => {
                        setRejectingId(proofCommission._id);
                        setProofCommission(null);
                      }}
                      className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
                    >
                      Reject
                    </button>
                  </>
                )}

                {(proofCommission.status === 'rejected' || proofCommission.status === 'paid') && (
                  <button
                    onClick={() => {
                      setProofCommission(null);
                      setDeleteTargetId(proofCommission._id);
                    }}
                    className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Deal Closing Details Modal */}
        {selectedDealClosing && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-700 overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-gradient-to-r from-indigo-600/20 to-purple-600/20">
                <h2 className="text-2xl font-bold text-white">Deal Details</h2>
                <button onClick={() => setSelectedDealClosing(null)} className="text-slate-400 hover:text-white p-2 rounded-lg"><X size={24} /></button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">Client Name</p>
                    <p className="text-white font-semibold mb-3">{selectedDealClosing.clientName}</p>

                    <p className="text-slate-400 text-sm mb-1">Client Number</p>
                    <p className="text-white font-semibold mb-3">{selectedDealClosing.clientNumber}</p>

                    <p className="text-slate-400 text-sm mb-1">Developer</p>
                    <p className="text-white font-semibold mb-3">{selectedDealClosing.developer}</p>

                    <p className="text-slate-400 text-sm mb-1">Employee</p>
                    <p className="text-white font-semibold mb-3">{selectedDealClosing.userId?.name || '—'}</p>

                    <p className="text-slate-400 text-sm mb-1">Unit Code</p>
                    <p className="text-white font-semibold mb-3">{selectedDealClosing.unitCode}</p>

                    <p className="text-slate-400 text-sm mb-1">Unit Type</p>
                    <p className="text-white font-semibold mb-3">{selectedDealClosing.unitType}</p>
                  </div>

                  <div>
                    <p className="text-slate-400 text-sm mb-1">Unit Area</p>
                    <p className="text-white font-semibold mb-3">{selectedDealClosing.unitArea} </p>

                    <p className="text-slate-400 text-sm mb-1">Contract Price</p>
                    <p className="text-white font-semibold mb-3">{selectedDealClosing.contractPrice}</p>

                    <p className="text-slate-400 text-sm mb-1">Contract Date</p>
                    <p className="text-white font-semibold mb-3">{selectedDealClosing.contractDate ? new Date(selectedDealClosing.contractDate).toLocaleDateString() : '—'}</p>

                    <p className="text-slate-400 text-sm mb-1">Finishing Type</p>
                    <p className="text-white font-semibold mb-3">{selectedDealClosing.finishingType}</p>

                    <p className="text-slate-400 text-sm mb-1">Delivery Year</p>
                    <p className="text-white font-semibold mb-3">{selectedDealClosing.deliveryDate}</p>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm text-slate-300 mb-2">Payment & Down Payment</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-slate-400 text-sm">Payment Plan</p>
                      <p className="text-white font-semibold">{selectedDealClosing.paymentPlan}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Down Payment %</p>
                      <p className="text-white font-semibold">{selectedDealClosing.downPaymentPercentage}%</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-sm">Down Payment Amount</p>
                      <p className="text-white font-semibold">{selectedDealClosing.downPaymentAmount}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm text-slate-300 mb-2">Additional Info</h3>
                  <div className="text-slate-200 whitespace-pre-wrap">{selectedDealClosing.info}</div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm text-slate-300 mb-2">Attachments</h3>
                  {selectedDealClosing.attachments && selectedDealClosing.attachments.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedDealClosing.attachments.map((a: string, i: number) => (
                        <a key={i} href={a} target="_blank" rel="noreferrer" className="block">
                          <img src={a} alt={`attachment-${i}`} className="w-full h-36 object-cover rounded-lg" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-400">No attachments</div>
                  )}
                </div>
              </div>

              <div className="p-6 border-t border-slate-700 bg-slate-800 flex gap-3 justify-end">
                <button onClick={() => setSelectedDealClosing(null)} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Approve Commission Modal - Set Amount */}
        {approvingId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
              <div className="p-6 border-b border-slate-600">
                <h2 className="text-2xl font-bold text-white">Approve Commission</h2>
                <p className="text-slate-400 text-sm mt-1">Enter the commission amount to approve</p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Commission Amount ($)</label>
                  <input
                    type="number"
                    value={approvalAmount}
                    onChange={(e) => setApprovalAmount(e.target.value)}
                    placeholder="Enter amount..."
                    className="w-full px-4 py-2 border border-slate-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-white bg-slate-900 placeholder-slate-500"
                    autoFocus
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => handleApprove(approvingId)}
                    disabled={!approvalAmount || isNaN(Number(approvalAmount))}
                    className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:from-slate-600 disabled:to-slate-600 text-white py-2 rounded-lg font-semibold transition-all"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => {
                      setApprovingId(null);
                      setApprovalAmount('');
                    }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-semibold transition-all border border-slate-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Delete Confirmation Modal */}
        {deleteTargetId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
              <div className="p-6 border-b border-slate-600">
                <h2 className="text-2xl font-bold text-white">Confirm Deletion</h2>
                <p className="text-slate-400 text-sm mt-1">This will permanently delete the commission. This action cannot be undone.</p>
              </div>

              <div className="p-6 space-y-4">
                <div className="text-sm text-slate-300">Are you sure you want to delete this commission?</div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => handleDelete(deleteTargetId)}
                    className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white py-2 rounded-lg font-semibold transition-all"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setDeleteTargetId(null)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-semibold transition-all border border-slate-600"
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
