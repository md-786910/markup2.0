import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { TOKEN_KEY } from '../utils/constants';
import {
  getNotificationsApi,
  markAsReadApi,
  markAllAsReadApi,
  deleteNotificationApi,
  clearAllNotificationsApi,
} from '../services/notificationService';

const SOCKET_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

export const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const socketRef = useRef(null);

  const fetchNotifications = useCallback(async (options = {}) => {
    if (!token || !user) return;
    try {
      setLoading(true);
      const res = await getNotificationsApi(options);
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  // Initial load
  useEffect(() => {
    if (user && token) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, token, fetchNotifications]);

  // Real-time socket listener
  useEffect(() => {
    const currentToken = token || localStorage.getItem(TOKEN_KEY);
    if (!currentToken || !user) return;

    const socket = io(SOCKET_URL, {
      auth: { token: currentToken },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('notification:new', (newNotif) => {
      setNotifications((prev) => {
        // Prevent duplicate
        if (prev.some((n) => n._id === newNotif._id)) return prev;
        return [newNotif, ...prev];
      });
      setUnreadCount((prev) => prev + 1);
      setHasNewNotification(true);
      setTimeout(() => setHasNewNotification(false), 3000);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user]);

  const markAsRead = useCallback(async (id) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await markAsReadApi(id);
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      // Revert if failed
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await markAllAsReadApi();
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      fetchNotifications();
    }
  }, [fetchNotifications]);

  const deleteNotification = useCallback(async (id) => {
    const target = notifications.find((n) => n._id === id);
    const wasUnread = target && !target.read;

    setNotifications((prev) => prev.filter((n) => n._id !== id));
    if (wasUnread) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      await deleteNotificationApi(id);
    } catch (err) {
      console.error('Failed to delete notification:', err);
      fetchNotifications();
    }
  }, [notifications, fetchNotifications]);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    setUnreadCount(0);

    try {
      await clearAllNotificationsApi();
    } catch (err) {
      console.error('Failed to clear notifications:', err);
      fetchNotifications();
    }
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        hasNewNotification,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
