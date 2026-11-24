import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { TOKEN_KEY } from '../utils/constants';

const SOCKET_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

// One Socket.IO connection per tab, shared by the notifications (user room)
// and the open project (project room) instead of one WebSocket each. Holders
// acquire it and release it when done; it closes when the last one releases.
// It belongs to the account it was opened for (the token's user id): another
// account signing in gets a new connection, and the old one closes once its
// holders release it. A renewed token of the same account keeps the
// connection (each reconnect reads the current token).
let shared = null; // { socket, userKey, refs }

function tokenUserKey(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.id ? String(payload.id) : token;
  } catch {
    return token;
  }
}

export function acquireSocket() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const userKey = tokenUserKey(token);
  if (!shared || shared.userKey !== userKey) {
    const socket = io(SOCKET_URL, {
      // Read on every (re)connect, so a renewed session token (password
      // change, sign-in in another tab) is used instead of the first one
      auth: (cb) => cb({ token: localStorage.getItem(TOKEN_KEY) || token }),
      transports: ['websocket', 'polling'],
    });
    // The server closes a user's connections when their session changes; come
    // back with the current token (an ended session is refused on connect)
    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect' && localStorage.getItem(TOKEN_KEY)) socket.connect();
    });
    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });
    shared = { socket, userKey, refs: 0 };
  }
  shared.refs += 1;
  return shared;
}

export function releaseSocket(entry) {
  if (!entry) return;
  entry.refs -= 1;
  if (entry.refs > 0) return;
  entry.socket.disconnect();
  if (shared === entry) shared = null;
}

/**
 * Hook that joins a project room on the tab's shared socket,
 * tracks online presence with last-seen timestamps,
 * and provides a method to subscribe to events.
 */
export function useSocket(projectId) {
  const socketRef = useRef(null);
  const [socketVersion, setSocketVersion] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [lastSeenMap, setLastSeenMap] = useState({});
  // Goes up after each reconnect (e.g. a server worker restarted): events sent
  // while disconnected were missed, so screens re-fetch their data.
  const [resyncKey, setResyncKey] = useState(0);

  useEffect(() => {
    if (!projectId) return;
    const entry = acquireSocket();
    if (!entry) return;
    const { socket } = entry;

    // Join now if the shared socket is already connected, and again on every
    // later (re)connect; after a reconnect screens re-fetch what they missed
    let joined = false;
    const join = () => {
      socket.emit('join:project', projectId);
      if (joined) setResyncKey((k) => k + 1);
      joined = true;
    };
    if (socket.connected) join();
    socket.on('connect', join);

    // Presence tracking
    const onOnline = ({ userIds }) => {
      setOnlineUsers(new Set(userIds));
    };
    const onJoined = ({ userId }) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
    };
    const onLeft = ({ userId, lastSeen }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      if (lastSeen) {
        setLastSeenMap((prev) => ({ ...prev, [userId]: lastSeen }));
      }
    };
    socket.on('presence:online', onOnline);
    socket.on('presence:joined', onJoined);
    socket.on('presence:left', onLeft);

    socketRef.current = socket;
    setSocketVersion((v) => v + 1);

    return () => {
      socket.emit('leave:project', projectId);
      socket.off('connect', join);
      socket.off('presence:online', onOnline);
      socket.off('presence:joined', onJoined);
      socket.off('presence:left', onLeft);
      releaseSocket(entry);
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

  return { onEvent, onlineUsers, lastSeenMap, resyncKey };
}
