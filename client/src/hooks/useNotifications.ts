import { useState, useEffect, useCallback, useRef } from 'react';
import { SecureAPI } from '../utils/api';

const NOTIF_PREF_KEY = 'tofas_notifications_enabled';
const POLL_INTERVAL = 60_000; // 1 dakika

export interface AppNotification {
  _id: string;
  title: string;
  message: string;
  type:
    | 'info'
    | 'success'
    | 'warning'
    | 'error'
    | 'request'
    | 'approval'
    | 'reminder'
    | 'announcement';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const prevUnreadRef = useRef(-1); // -1 = henüz yüklenmedi, ilk fetch'te bildirim gösterme
  const shownNotifIdsRef = useRef<Set<string>>(new Set());

  const browserEnabled =
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted' &&
    localStorage.getItem(NOTIF_PREF_KEY) === 'true';

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await SecureAPI.get(`/api/notifications/user/${userId}?limit=10`);
      const data = (res as any).data;
      if (data.success) {
        setNotifications(data.data || []);
        const newUnread = data.unreadCount ?? 0;

        // Yeni bildirim geldi mi kontrol et (ilk yüklemede atla)
        if (browserEnabled && prevUnreadRef.current >= 0 && newUnread > prevUnreadRef.current) {
          const latest = (data.data || [])[0];
          if (latest && !latest.read && !shownNotifIdsRef.current.has(latest._id)) {
            shownNotifIdsRef.current.add(latest._id);
            new Notification(latest.title, {
              body: latest.message,
              icon: '/tofaslogo.png',
            });
          }
        }
        prevUnreadRef.current = newUnread;
        setUnreadCount(newUnread);
      }
    } catch {
      // API bağlantı hatası - sessizce geç
    }
  }, [userId, browserEnabled]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await SecureAPI.patch(`/api/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // sessizce geç
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n._id);
    if (unreadIds.length === 0) return;
    try {
      await SecureAPI.patch('/api/notifications/bulk-read', { notificationIds: unreadIds });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // sessizce geç
    }
  }, [notifications]);

  useEffect(() => {
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Initial fetch on mount - fetchNotifications is async and sets state after API call
   
  useEffect(() => {
    void fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
