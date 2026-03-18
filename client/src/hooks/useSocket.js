import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { TOKEN_KEY } from '../utils/constants';

const SOCKET_URL = 'http://localhost:5000';

/**
 * Hook that connects to Socket.IO, joins a project room,
 * and provides a method to subscribe to events.
 */
export function useSocket(projectId) {
  const socketRef = useRef(null);

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

    socketRef.current = socket;

    return () => {
      socket.emit('leave:project', projectId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId]);

  const onEvent = useCallback((event, handler) => {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, []);

  return { onEvent };
}
