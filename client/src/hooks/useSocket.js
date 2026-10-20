import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { TOKEN_KEY } from '../utils/constants';

const SOCKET_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

/**
 * Hook that connects to Socket.IO, joins a project room,
 * tracks online presence with last-seen timestamps,
 * and provides a method to subscribe to events.
 */
export function useSocket(projectId) {
  const socketRef = useRef(null);
  const [socketVersion, setSocketVersion] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [lastSeenMap, setLastSeenMap] = useState({});

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !projectId) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('join:project', projectId);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    // Presence tracking
    socket.on('presence:online', ({ userIds }) => {
      setOnlineUsers(new Set(userIds));
    });

    socket.on('presence:joined', ({ userId }) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
    });

    socket.on('presence:left', ({ userId, lastSeen }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      if (lastSeen) {
        setLastSeenMap((prev) => ({ ...prev, [userId]: lastSeen }));
      }
    });

    socketRef.current = socket;
    setSocketVersion((v) => v + 1);

    return () => {
      socket.emit('leave:project', projectId);
      socket.disconnect();
      socketRef.current = null;
      setOnlineUsers(new Set());
      setLastSeenMap({});
    };
  }, [projectId]);

  const onEvent = useCallback((event, handler) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, [socketVersion]);

  return { onEvent, onlineUsers, lastSeenMap };
}
