/**
 * Realtime Context — owns the Socket.IO connection and the notification
 * list/unread-count state that both the bell dropdown and any other future
 * live-updating UI (e.g. leaderboard) can subscribe to.
 *
 * Connects once the user is authenticated, disconnects on logout. Falls back
 * gracefully to whatever was already loaded via the REST API if the socket
 * never connects (e.g. corporate network blocking WebSockets) — the bell
 * still works via manual refresh/polling-on-open, it just won't be live.
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import api from '../lib/axios';
import { useAuth } from './auth-context';

export interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  read: boolean;
  createdAt: string;
}

interface RealtimeContextValue {
  connected: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/my', { params: { limit: 20 } });
      setNotifications(data.data || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // Not fatal — bell just stays empty until the next successful fetch.
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    refresh();

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const socket = io({
      path: '/socket.io',
      auth: { token },
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('notification:new', (n: NotificationItem) => {
      setNotifications((prev) => [n, ...prev].slice(0, 50));
      setUnreadCount((c) => c + 1);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, refresh]);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      // Local state already updated optimistically; a failed sync self-heals on next refresh().
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await api.patch('/notifications/read-all');
    } catch {
      // Same self-healing note as markAsRead.
    }
  }, []);

  return (
    <RealtimeContext.Provider value={{ connected, notifications, unreadCount, markAsRead, markAllRead, refresh }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within a RealtimeProvider');
  return ctx;
}
