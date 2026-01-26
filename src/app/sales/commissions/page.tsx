'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader, DollarSign, Clock } from 'lucide-react';

interface Commission {
  _id: string;
  amount: number;
  percentage: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  dealId: { name: string; value: number };
}

export default function SalesCommissions() {
  const { user, loading, token } = useAuth();
  const router = useRouter();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    paid: 0,
  });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'sales')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (token) {
      fetchCommissions();
    }
  }, [token]);

  const fetchCommissions = async () => {
    try {
      const res = await fetch('/api/commissions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const comms: Commission[] = Array.isArray(data.commissions) ? data.commissions : [];
      setCommissions(comms);

      setStats({
        pending: comms.filter((c: Commission) => c.status === 'pending').length,
        approved: comms.filter((c: Commission) => c.status === 'approved').length,
        paid: comms.filter((c: Commission) => c.status === 'paid').length,
      });
    } catch (error) {
      console.error('Error fetching commissions:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalAmount = commissions.reduce((sum, c) => sum + c.amount, 0);
  const pendingAmount = commissions
    .filter((c) => c.status === 'pending')
    .reduce((sum, c) => sum + c.amount, 0);
  const approvedAmount = commissions
    .filter((c) => c.status === 'approved')
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">My Commissions</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Earned</p>
                <p className="text-3xl font-bold text-gray-800">${totalAmount.toLocaleString()}</p>
              </div>
              <DollarSign size={32} className="text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pending Approval</p>
                <p className="text-3xl font-bold text-gray-800">${pendingAmount.toLocaleString()}</p>
              </div>
              <Clock size={32} className="text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Approved/Paid</p>
                <p className="text-3xl font-bold text-gray-800">${approvedAmount.toLocaleString()}</p>
              </div>
              <DollarSign size={32} className="text-green-500" />
            </div>
          </div>
        </div>

        {/* Commissions List */}
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Commission Details</h2>

        {loadingData ? (
          <div className="flex items-center justify-center py-12">
            <Loader size={32} className="animate-spin text-blue-600" />
          </div>
        ) : commissions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">No commissions yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {commissions.map((commission) => (
              <div
                key={commission._id}
                className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{commission.dealId.name}</h3>
                    <p className="text-sm text-gray-600">Deal Value: ${commission.dealId.value.toLocaleString()}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      statusColors[commission.status]
                    }`}
                  >
                    {commission.status}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">${commission.amount.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">{commission.percentage}% Commission</p>
                  </div>

                  {commission.status === 'pending' && (
                    <div className="bg-yellow-50 px-4 py-2 rounded text-sm text-yellow-700">
                      Waiting for admin approval
                    </div>
                  )}
                  {commission.status === 'approved' && (
                    <div className="bg-blue-50 px-4 py-2 rounded text-sm text-blue-700">
                      Approved by admin
                    </div>
                  )}
                  {commission.status === 'paid' && (
                    <div className="bg-green-50 px-4 py-2 rounded text-sm text-green-700">
                      ✓ Payment received
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
