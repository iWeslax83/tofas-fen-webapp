import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SecureAPI } from '../utils/api';
import { requestNotificationPermission, sendNotification } from '../utils/pwa';
import { useAuthContext } from './AuthContext';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'request' | 'approval' | 'reminder' | 'announcement';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'academic' | 'administrative' | 'social' | 'technical' | 'security' | 'general';
  read: boolean;
  archived: boolean;
  actionUrl?: string;
  actionText?: string;
  icon?: string;
  expiresAt?: string;
  sentAt: string;
  deliveredAt: string;
  readAt?: string;
  metadata?: Record<string, unknown>;
  relatedEntity?: {
    type: 'user' | 'note' | 'announcement' | 'request' | 'club' | 'event';
    id: string;
  };
  sender?: {
    id: string;
    name: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markMultipleAsRead: (ids: string[]) => Promise<void>;
  archiveNotification: (id: string) => Promise<void>;
  addNotification: (notification: Notification) => void;
  clearError: () => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user } = useAuthContext();
  const userId = user?.id || '';
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await SecureAPI.get(`/api/notifications/user/${userId}?page=1&limit=50`);
      const data = (response as { data: Notification[] }).data;

      if (data.success) {
        setNotifications(data.data || []);
        setUnreadCount(data.unreadCount || 0);
      } else {
        setError('Bildirimler yüklenemedi');
      }
    } catch (err: unknown) {
      console.error('Error fetching notifications:', err);
      // Don't show error for timeout or network issues to avoid spam
      if (err.code !== 'ECONNABORTED' && err.code !== 'NETWORK_ERROR') {
        setError('Bildirimler yüklenirken hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch notifications when userId changes
  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [userId, fetchNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await SecureAPI.patch(`/api/notifications/${id}/read`);
      
      if ((response as { data: { success: boolean } }).data.success) {
        setNotifications(prev => 
          prev.map(n => n._id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        // Send browser notification
        const notification = notifications.find(n => n._id === id);
        if (notification && !notification.read) {
          sendNotification(notification.title, {
            body: notification.message,
            icon: '/tofaslogo.png'
          });
        }
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError('Bildirim okundu olarak işaretlenemedi');
    }
  }, [notifications]);

  // Mark multiple notifications as read
  const markMultipleAsRead = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;

    try {
      const response = await SecureAPI.patch('/api/notifications/bulk-read', {
        notificationIds: ids
      });
      
      if ((response as { data: { success: boolean } }).data.success) {
        setNotifications(prev => 
          prev.map(n => 
            ids.includes(n._id) 
              ? { ...n, read: true, readAt: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - ids.length));
      }
    } catch (err) {
      console.error('Error marking multiple notifications as read:', err);
      setError('Bildirimler okundu olarak işaretlenemedi');
    }
  }, []);

  // Archive notification
  const archiveNotification = useCallback(async (id: string) => {
    try {
      const response = await SecureAPI.patch(`/api/notifications/${id}/archive`);
      
      if ((response as { data: { success: boolean } }).data.success) {
        setNotifications(prev => prev.filter(n => n._id !== id));
      }
    } catch (err) {
      console.error('Error archiving notification:', err);
      setError('Bildirim arşivlenemedi');
    }
  }, []);

  // Add notification to state (for real-time updates)
  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.read) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto-refresh every 2 minutes (reduced frequency)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
    }, 120000); // 2 minutes instead of 30 seconds

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // WebSocket connection for real-time updates (completely disabled)
  // Note: WebSocket support is not implemented on the server side yet
  // We rely on polling for real-time updates instead
  useEffect(() => {
    // WebSocket is completely disabled until server-side WebSocket support is implemented
    // This prevents WebSocket connection errors in the console
    return;
  }, [userId, addNotification]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markMultipleAsRead,
    archiveNotification,
    addNotification,
    clearError,
    refreshNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
