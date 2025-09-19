import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Bell, Check, Archive, Filter, X, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SecureAPI } from '../utils/api';
import { requestNotificationPermission, sendNotification } from '../utils/pwa';
import './NotificationBell.css';

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

interface NotificationBellProps {
  userId: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ userId }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Fetch notifications with better error handling
  const fetchNotifications = useCallback(async (pageNum = 1, reset = false) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '10',
        includeArchived: 'false'
      });

      if (filter === 'unread') params.append('read', 'false');
      if (filter === 'read') params.append('read', 'true');

      const response = await SecureAPI.get(`/api/notifications/user/${userId}?${params}`);
      const data = (response as { data: Notification[] }).data;

      if (reset) {
        setNotifications(data.data || []);
      } else {
        setNotifications(prev => [...prev, ...(data.data || [])]);
      }

      setUnreadCount(data.unreadCount || 0);
      setHasMore(data.pagination && data.pagination.page < data.pagination.totalPages);
      setPage(pageNum);
    } catch (error: unknown) {
      console.error('Error fetching notifications:', error);
      
      // Handle 429 (Too Many Requests) error specifically
      if (error?.response?.status === 429) {
        console.warn('Rate limit exceeded for notifications. Skipping this request.');
        // Don't show error to user for rate limiting
        return;
      }
      
      // For other errors, you might want to show a user-friendly message
      // but for now, just log it
    } finally {
      setLoading(false);
    }
  }, [userId, filter]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications(1, true);
  }, [fetchNotifications]);

  // Auto-refresh every 2 minutes (reduced frequency)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!open) {
        fetchNotifications(1, true);
      }
    }, 120000); // 2 minutes instead of 30 seconds

    return () => clearInterval(interval);
  }, [fetchNotifications, open]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSelectedNotifications([]);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // Intersection observer for infinite scroll
  const lastNotificationRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchNotifications(page + 1);
      }
    });
    
    if (node) observerRef.current.observe(node);
  }, [loading, hasMore, page, fetchNotifications]);

  // Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      await SecureAPI.patch(`/api/notifications/${id}/read`);
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
    } catch (error: unknown) {
      console.error('Error marking notification as read:', error);
      
      // Handle 429 error gracefully
      if (error?.response?.status === 429) {
        console.warn('Rate limit exceeded. Notification will be marked as read locally.');
        // Still update UI locally even if API call fails
        setNotifications(prev => 
          prev.map(n => n._id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
  };

  // Mark multiple notifications as read
  const markMultipleAsRead = async () => {
    if (selectedNotifications.length === 0) return;
    
    try {
      await SecureAPI.patch('/api/notifications/bulk-read', {
        notificationIds: selectedNotifications
      });
      
      setNotifications(prev => 
        prev.map(n => 
          selectedNotifications.includes(n._id) 
            ? { ...n, read: true, readAt: new Date().toISOString() }
            : n
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - selectedNotifications.length));
      setSelectedNotifications([]);
    } catch (error: unknown) {
      console.error('Error marking multiple notifications as read:', error);
      
      // Handle 429 error gracefully
      if (error?.response?.status === 429) {
        console.warn('Rate limit exceeded. Notifications will be marked as read locally.');
        // Still update UI locally even if API call fails
        setNotifications(prev => 
          prev.map(n => 
            selectedNotifications.includes(n._id) 
              ? { ...n, read: true, readAt: new Date().toISOString() }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - selectedNotifications.length));
        setSelectedNotifications([]);
      }
    }
  };

  // Archive notification
  const archiveNotification = async (id: string) => {
    try {
      await SecureAPI.patch(`/api/notifications/${id}/archive`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (error: unknown) {
      console.error('Error archiving notification:', error);
      
      // Handle 429 error gracefully
      if (error?.response?.status === 429) {
        console.warn('Rate limit exceeded. Notification will be archived locally.');
        // Still update UI locally even if API call fails
        setNotifications(prev => prev.filter(n => n._id !== id));
      }
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }
    
    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank');
    }
  };

  // Toggle notification selection
  const toggleNotificationSelection = (id: string) => {
    setSelectedNotifications(prev => 
      prev.includes(id) 
        ? prev.filter(n => n !== id)
        : [...prev, id]
    );
  };

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      request: '📝',
      approval: '👤',
      reminder: '⏰',
      announcement: '📢'
    };
    return icons[type as keyof typeof icons] || '📢';
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    const colors = {
      low: '#6B7280',
      medium: '#3B82F6',
      high: '#F59E0B',
      urgent: '#EF4444'
    };
    return colors[priority as keyof typeof colors] || '#3B82F6';
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Az önce';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} saat önce`;
    } else if (diffInHours < 48) {
      return 'Dün';
    } else {
      return date.toLocaleDateString('tr-TR');
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className="notification-bell-button"
        onClick={() => setOpen(prev => !prev)}
        aria-label="Bildirimler"
      >
        <Bell className="notification-bell-icon" />
        {unreadCount > 0 && (
          <motion.span 
            className="notification-bell-badge"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div 
            className="notification-dropdown"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="notification-dropdown-header">
              <div className="notification-header-left">
                <h3>Bildirimler</h3>
                {unreadCount > 0 && (
                  <span className="unread-count">{unreadCount} yeni</span>
                )}
              </div>
              <div className="notification-header-actions">
                <button
                  className="notification-filter-btn"
                  onClick={() => setShowFilters(!showFilters)}
                  title="Filtrele"
                >
                  <Filter size={16} />
                </button>
                {selectedNotifications.length > 0 && (
                  <button
                    className="notification-mark-read-btn"
                    onClick={markMultipleAsRead}
                    title="Seçilenleri okundu işaretle"
                  >
                    <Check size={16} />
                  </button>
                )}
                <button
                  className="notification-close-btn"
                  onClick={() => setOpen(false)}
                  title="Kapat"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Filters */}
            {showFilters && (
              <motion.div 
                className="notification-filters"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <div className="filter-buttons">
                  <button
                    className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                    onClick={() => setFilter('all')}
                  >
                    Tümü
                  </button>
                  <button
                    className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
                    onClick={() => setFilter('unread')}
                  >
                    Okunmamış
                  </button>
                  <button
                    className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
                    onClick={() => setFilter('read')}
                  >
                    Okunmuş
                  </button>
                </div>
              </motion.div>
            )}

            {/* Notifications List */}
            <div className="notification-list-container">
              {notifications.length === 0 ? (
                <div className="notification-dropdown-empty">
                  <Bell size={48} />
                  <p>Henüz bildiriminiz yok.</p>
                </div>
              ) : (
                <div className="notification-list">
                  {notifications.map((notification, index) => (
                    <motion.div
                      key={notification._id}
                      className={`notification-item ${notification.read ? 'read' : 'unread'} ${notification.priority}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      ref={index === notifications.length - 1 ? lastNotificationRef : null}
                    >
                      <div className="notification-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedNotifications.includes(notification._id)}
                          onChange={() => toggleNotificationSelection(notification._id)}
                        />
                      </div>
                      
                      <div 
                        className="notification-content"
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="notification-icon">
                          <span style={{ fontSize: '20px' }}>
                            {notification.icon || getNotificationIcon(notification.type)}
                          </span>
                        </div>
                        
                        <div className="notification-details">
                          <div className="notification-title">
                            {notification.title}
                            {!notification.read && (
                              <span className="notification-unread-dot" />
                            )}
                          </div>
                          <div className="notification-message">
                            {notification.message}
                          </div>
                          <div className="notification-meta">
                            <span className="notification-time">
                              {formatDate(notification.createdAt)}
                            </span>
                            <span 
                              className="notification-priority"
                              style={{ backgroundColor: getPriorityColor(notification.priority) }}
                            >
                              {notification.priority}
                            </span>
                            {notification.category && (
                              <span className="notification-category">
                                {notification.category}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="notification-actions">
                          {notification.actionUrl && (
                            <button
                              className="notification-action-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(notification.actionUrl, '_blank');
                              }}
                              title={notification.actionText || 'Aç'}
                            >
                              <ExternalLink size={16} />
                            </button>
                          )}
                          <button
                            className="notification-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              archiveNotification(notification._id);
                            }}
                            title="Arşivle"
                          >
                            <Archive size={16} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  
                  {loading && (
                    <div className="notification-loading">
                      <div className="loading-spinner" />
                      <span>Yükleniyor...</span>
                    </div>
                  )}
                  
                  {!loading && !hasMore && notifications.length > 0 && (
                    <div className="notification-end">
                      <span>Tüm bildirimler yüklendi</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
