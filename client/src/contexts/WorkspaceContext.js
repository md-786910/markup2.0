import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  getWorkspacesApi,
  createWorkspaceApi,
  renameWorkspaceApi,
  deleteWorkspaceApi,
} from '../services/workspaceService';

// Workspaces group projects inside the organization. The selected one is
// remembered per organization in this browser.
const WorkspaceContext = createContext(null);

const storageKey = (orgId) => `kommently.workspace.${orgId}`;
const readStored = (orgId) => {
  try { return localStorage.getItem(storageKey(orgId)); } catch { return null; }
};
const writeStored = (orgId, id) => {
  try { localStorage.setItem(storageKey(orgId), id); } catch { /* private mode */ }
};

// Pick the workspace to open next time the org's workspaces load (e.g. right
// after accepting a workspace invitation)
export function rememberWorkspace(orgId, workspaceId) {
  if (orgId && workspaceId) writeStored(orgId, workspaceId);
}

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const orgId = user?.organization || null;
  const [workspaces, setWorkspaces] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!orgId) return [];
    const res = await getWorkspacesApi();
    const list = res.data.workspaces || [];
    setWorkspaces(list);
    return list;
  }, [orgId]);

  useEffect(() => {
    if (!orgId) {
      setWorkspaces([]);
      setCurrentId(null);
      return;
    }
    setLoading(true);
    refresh()
      .then((list) => {
        const stored = readStored(orgId);
        const pick = list.find((w) => w._id === stored) || list.find((w) => w.isDefault) || list[0];
        setCurrentId(pick?._id || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orgId, refresh]);

  const select = useCallback((id) => {
    setCurrentId(id);
    if (orgId) writeStored(orgId, id);
  }, [orgId]);

  const create = useCallback(async (name) => {
    const res = await createWorkspaceApi(name);
    await refresh();
    select(res.data.workspace._id);
    return res.data.workspace;
  }, [refresh, select]);

  const rename = useCallback(async (id, name) => {
    await renameWorkspaceApi(id, name);
    await refresh();
  }, [refresh]);

  const remove = useCallback(async (id) => {
    const res = await deleteWorkspaceApi(id);
    const list = await refresh();
    if (id === currentId) select(res.data.movedTo || list.find((w) => w.isDefault)?._id);
    return res.data;
  }, [refresh, select, currentId]);

  const current = useMemo(
    () => workspaces.find((w) => w._id === currentId) || workspaces.find((w) => w.isDefault) || null,
    [workspaces, currentId],
  );

  const value = useMemo(
    () => ({ workspaces, current, loading, select, refresh, create, rename, remove }),
    [workspaces, current, loading, select, refresh, create, rename, remove],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaces() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspaces must be used within WorkspaceProvider');
  return ctx;
}
