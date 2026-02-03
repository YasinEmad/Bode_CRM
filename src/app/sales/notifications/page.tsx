'use client';

import { useAuth } from '@/hooks/useAuth';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useEffect, useState } from 'react';
import { Bell, Check, Trash2, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  leadId: {
    _id: string;
    name: string;
    phone: string;
  };
  fromUser?: {
    _id: string;
    name: string;
  };
  isRead: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { user, token } = useAuth();
  useProtectedRoute('sales');

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [token]);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US');
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.isRead)
    : notifications;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="text-purple-400" size={32} />
            <div>
              <h1 className="text-3xl font-bold text-white">Notifications</h1>
              <p className="text-slate-400">Manage all your notifications</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Filters & Actions */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Check size={18} />
                Mark All as Read
              </button>
            )}
            <button
              onClick={fetchNotifications}
              disabled={isLoading}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin inline-block">
                <RefreshCw size={32} className="text-purple-400" />
              </div>
              <p className="text-slate-400 mt-4">Loading...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-12 text-center">
              <Bell className="text-slate-500 size-12 mx-auto mb-4 opacity-50" />
              <p className="text-slate-400 text-lg">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
              </p>
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <div
                key={notification._id}
                className={`bg-slate-800/50 border rounded-lg p-4 transition-all ${
                  !notification.isRead
                    ? 'border-purple-500/50 bg-slate-800/80'
                    : 'border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Title & Status */}
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-white">
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <span className="inline-block bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                          New
                        </span>
                      )}
                    </div>

                    {/* Message */}
                    <p className="text-slate-300 mb-3">
                      {notification.message}
                    </p>

                    {/* Lead Details */}
                    {notification.leadId && (
                      <div className="bg-slate-700/50 rounded p-3 mb-3 text-sm space-y-1">
                        <p className="text-slate-200">
                          <strong className="text-slate-100">Client:</strong> {notification.leadId.name}
                        </p>
                        <p className="text-slate-200">
                          <strong className="text-slate-100">Phone:</strong> {notification.leadId.phone}
                        </p>
                        {notification.fromUser && (
                          <p className="text-slate-200">
                            <strong className="text-slate-100">From:</strong> {notification.fromUser.name}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Time */}
                    <p className="text-xs text-slate-500">
                      {formatTime(notification.createdAt)}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    {!notification.isRead && (
                      <button
                        onClick={() => markAsRead(notification._id)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <Check size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification._id)}
                      className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      title="Delete notification"
                    >
                      <Trash2 size={18} />
                    </button>
                    <Link
                      href={`/sales/leads`}
                      className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      title="Go to lead"
                    >
                      <span className="text-sm font-medium">View</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
