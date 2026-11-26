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
 *
 * `pauseWhenHidden`: while the tab is in the background, signals are only
 * noted; the handler runs once when the tab is shown again (a dashboard left
 * open behind a review tab no longer re-fetches on every pin and comment).
 */
export function useLiveSync(topics, handler, { projectId, enabled = true, delay = 400, pauseWhenHidden = false } = {}) {
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
    let missed = false;
    const fire = () => {
      clearTimeout(timer);
      if (pauseWhenHidden && document.hidden) { missed = true; return; }
      timer = setTimeout(() => handlerRef.current?.(), delay);
    };
    const onVisible = () => {
      if (document.hidden || !missed) return;
      missed = false;
      fire();
    };
    if (pauseWhenHidden) document.addEventListener('visibilitychange', onVisible);
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
      if (pauseWhenHidden) document.removeEventListener('visibilitychange', onVisible);
      socket.off('sync', onSync);
      socket.off('connect', onConnect);
      releaseSocket(entry);
    };
  }, [topicKey, projectId, enabled, delay, pauseWhenHidden]);
}
