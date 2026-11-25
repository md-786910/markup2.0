import { useEffect, useRef } from 'react';
import { acquireSocket, releaseSocket } from './useSocket';

/**
 * Live sync (server: utils/liveSync.js). Calls `handler` (debounced) when the
 * organization changes something in one of `topics`, and after a socket
 * reconnect (signals sent while disconnected were missed). The handler
 * re-fetches through the API. With `projectId`, signals about other projects
 * are ignored (signals without a project still count).
 *
 * topics: 'projects' | 'pins' | 'project' | 'versions' | 'workspaces' | 'team' | 'org' | 'integrations'
 */
export function useLiveSync(topics, handler, { projectId, enabled = true, delay = 400 } = {}) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const topicKey = [].concat(topics).join(',');

  useEffect(() => {
    if (!enabled) return undefined;
    const entry = acquireSocket();
    if (!entry) return undefined;
    const { socket } = entry;
    const wanted = new Set(topicKey.split(','));
    let timer = null;
    const fire = () => {
      clearTimeout(timer);
      timer = setTimeout(() => handlerRef.current?.(), delay);
    };
    const onSync = (msg) => {
      if (!msg?.topics?.some((t) => wanted.has(t))) return;
      if (projectId && msg.projectId && String(msg.projectId) !== String(projectId)) return;
      fire();
    };
    let connectedBefore = socket.connected;
    const onConnect = () => {
      if (connectedBefore) fire();
      connectedBefore = true;
    };
    socket.on('sync', onSync);
    socket.on('connect', onConnect);
    return () => {
      clearTimeout(timer);
      socket.off('sync', onSync);
      socket.off('connect', onConnect);
      releaseSocket(entry);
    };
  }, [topicKey, projectId, enabled, delay]);
}
