'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Header } from '@/components/layout/Header';
import { Card, Button, PageLoader, EmptyState } from '@/components/ui';
import { fetchNotifications as apiFetchNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/api';
import {
  HiOutlineBell,
  HiOutlineBellAlert,
  HiOutlineCheckCircle,
  HiOutlineCurrencyRupee,
  HiOutlineTrophy,
  HiOutlineExclamationTriangle,
  HiOutlineInformationCircle,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';
import type { Notification } from '@/types';

export default function NotificationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const hasFetched = useRef(false);

  const loadNotifications = useCallback(async (force = false) => {
    if (!force && (hasFetched.current || sessionStorage.getItem('notifications-fetched'))) return;
    hasFetched.current = true;
    sessionStorage.setItem('notifications-fetched', 'true');
    sessionStorage.setItem('notifications-last-fetch', Date.now().toString());

    const { data } = await apiFetchNotifications();
    setNotifications(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading) loadNotifications();
  }, [authLoading, loadNotifications]);

  // Refresh data when tab becomes visible (if it's been more than 2 minutes for notifications)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && !isLoading) {
        const lastFetch = sessionStorage.getItem('notifications-last-fetch');
        if (!lastFetch || Date.now() - parseInt(lastFetch) > 2 * 60 * 1000) {
          loadNotifications(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, isLoading, loadNotifications]);

  // Poll for new notifications every 30 seconds while page is visible
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      if (document.visibilityState === 'visible') {
        const { data } = await apiFetchNotifications();
        if (data.length > notifications.length) {
          toast('New notification!', { icon: '🔔' });
        }
        setNotifications(data);
        sessionStorage.setItem('notifications-last-fetch', Date.now().toString());
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user, notifications.length]);

  const handleMarkRead = async (id: string) => {
    const result = await markNotificationRead(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    }
  };

  const handleMarkAllRead = async () => {
    const result = await markAllNotificationsRead();
    if (result.error) {
      toast.error(result.error);
    } else {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    }
  };

  const filteredNotifications =
    filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const notificationIcon = (type: string) => {
    switch (type) {
      case 'payment_reminder':
        return <HiOutlineCurrencyRupee className="w-5 h-5 text-amber-500" />;
      case 'payment_received':
        return <HiOutlineCheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'auction_scheduled':
        return <HiOutlineBellAlert className="w-5 h-5 text-green-500" />;
      case 'auction_result':
        return <HiOutlineTrophy className="w-5 h-5 text-yellow-500" />;
      case 'payment_overdue':
        return <HiOutlineExclamationTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <HiOutlineInformationCircle className="w-5 h-5 text-foreground-muted" />;
    }
  };

  const relativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  if (authLoading || isLoading) {
    return (
      <>
        <Header title="Notifications" />
        <PageLoader />
      </>
    );
  }

  return (
    <>
      <Header
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
      >
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllRead}>
            Mark all read
          </Button>
        )}
      </Header>

      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'unread'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'bg-surface text-foreground-muted hover:bg-surface-hover border border-border'
              }`}
            >
              {f === 'all' ? 'All' : 'Unread'}
              {f === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {filteredNotifications.length === 0 ? (
          <EmptyState
            icon={<HiOutlineBell className="w-8 h-8" />}
            title={filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            description="You'll be notified about auction results, payment reminders, and more."
          />
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`transition-colors ${
                  !notification.is_read ? 'border-l-4 border-l-cyan-500 bg-cyan-500/5' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{notificationIcon(notification.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4
                        className={`text-sm ${!notification.is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground-secondary'}`}
                      >
                        {notification.title}
                      </h4>
                      <span className="text-xs text-foreground-muted whitespace-nowrap">
                        {relativeTime(notification.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground-muted mt-0.5">{notification.message}</p>
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkRead(notification.id)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-medium mt-2"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
