'use client';

import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import useTheme from '@/hooks/useTheme';

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

export default function NotificationsBell() {
  const { token, user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    if (token) {
      fetchNotifications();
      // Push notifications disabled — subscription removed

      const interval = setInterval(() => {
        if (!mounted) return;
        fetchNotifications();
      }, 30000);
      return () => {
        mounted = false;
        clearInterval(interval);
      };
    }
  }, [token, user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Lock body scroll while dropdown is open so the dropdown itself scrolls
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    if (isDropdownOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = originalOverflow || '';
    }
    return () => {
      document.body.style.overflow = originalOverflow || '';
    };
  }, [isDropdownOpen]);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
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
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
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
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className={`relative p-2 rounded-lg transition-all duration-200 ${
          isDark
            ? 'hover:bg-slate-800'
            : 'hover:bg-purple-50'
        }`}
        title="Notifications"
        aria-label="View notifications"
      >
        <div className="relative">
          <Bell 
            size={18} 
            className={isDark 
              ? 'text-purple-400 hover:text-purple-300' 
              : 'text-purple-700 hover:text-purple-800'
            }
          />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse border-2 border-white dark:border-slate-900">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </button>

      {/* Dropdown - Fixed position on mobile, absolute on larger screens */}
      {isDropdownOpen && (
        <>
          {/* Mobile/Tablet Overlay */}
          <div 
            className="lg:hidden fixed inset-0 z-[9998] bg-black/40"
            onClick={() => setIsDropdownOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div 
            className={`fixed lg:absolute lg:right-0 lg:mt-2 w-11/12 sm:w-96 lg:w-96
              ${isDark 
                ? 'bg-slate-900 border-slate-700 shadow-2xl shadow-black/50' 
                : 'bg-white border-gray-400 ring-1 ring-gray-200 shadow-2xl shadow-gray-500/40'
              }
              rounded-lg border z-[9999] max-h-[60vh] lg:max-h-[70vh] overflow-y-auto
              top-4 left-1/2 transform -translate-x-1/2 lg:top-auto lg:left-auto lg:translate-x-0
            `}
          >
            {/* Header */}
            <div 
              className={`sticky top-0 border-b p-4 flex justify-between items-center
                ${isDark 
                  ? 'bg-slate-900 border-slate-700' 
                  : 'bg-gray-50 border-gray-300'
                }
              `}
            >
              <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-950'}`}>
                Notifications
              </h3>
              <button
                onClick={() => setIsDropdownOpen(false)}
                className={`lg:hidden p-1 rounded-md transition-colors ${
                  isDark
                    ? 'hover:bg-slate-800 text-slate-400'
                    : 'hover:bg-gray-200 text-gray-700'
                }`}
                title="Close notifications"
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Actions */}
            {unreadCount > 0 && (
              <div className={`p-3 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                <button
                  onClick={markAllAsRead}
                  className={`w-full text-sm font-bold px-3 py-2 rounded-lg transition-colors
                    ${isDark
                      ? 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'
                      : 'bg-blue-700 text-white hover:bg-blue-800 shadow-md'
                    }
                  `}
                >
                  Mark All as Read
                </button>
              </div>
            )}

            {/* Notifications List */}
            <div className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-gray-200'}`}>
              {notifications.length === 0 ? (
                <div className={`p-8 text-center ${isDark ? 'text-slate-400' : 'text-gray-700'}`}>
                  <Bell size={32} className="mx-auto mb-2 opacity-60" />
                  <p className="font-medium">No notifications yet</p>
                </div>
              ) : (
                notifications.map(notification => (
                  <div
                    key={notification._id}
                    className={`p-4 transition-colors ${
                      !notification.isRead 
                        ? isDark
                          ? 'bg-slate-800/50'
                          : 'bg-blue-100/40'
                        : isDark
                        ? 'hover:bg-slate-800/30'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-950'}`}>
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        <p className={`text-sm mt-1 break-words leading-relaxed ${isDark ? 'text-slate-300' : 'text-gray-900'}`}>
                          {notification.message}
                        </p>
                        <p className={`text-xs mt-2 font-medium ${isDark ? 'text-slate-500' : 'text-gray-700'}`}>
                          {formatTime(notification.createdAt)}
                        </p>
                        {notification.leadId && (
                          <div className={`mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-gray-300'} text-xs space-y-1`}>
                            <p className={`font-medium ${isDark ? 'text-slate-400' : 'text-gray-800'}`}>
                              <strong>Client:</strong> {notification.leadId.name}
                            </p>
                            <p className={`font-medium ${isDark ? 'text-slate-400' : 'text-gray-800'}`}>
                              <strong>Phone:</strong> {notification.leadId.phone}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 flex-shrink-0">
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsRead(notification._id)}
                            className={`p-2 rounded-lg transition-colors ${
                              isDark
                                ? 'hover:bg-slate-700 text-blue-400'
                                : 'hover:bg-blue-200 text-blue-700 font-semibold'
                            }`}
                            title="Mark as read"
                          >
                            <Check size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification._id)}
                          className={`p-2 rounded-lg transition-colors ${
                            isDark
                              ? 'hover:bg-slate-700 text-red-400'
                              : 'hover:bg-red-200 text-red-700 font-semibold'
                          }`}
                          title="Delete notification"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
