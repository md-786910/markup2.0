import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { TOKEN_KEY } from '../utils/constants';
import { loginApi, signupApi, getMeApi, logoutApi } from '../services/authService';
import { setSentryUser } from '../monitoring/sentry';
import { identifyUser } from '../monitoring/analytics';
import { signingOutOnPurpose } from '../utils/returnTo';
import { setBillingAccess } from '../services/api';
import { useLiveSync } from '../hooks/useLiveSync';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  // Attach the signed-in user id to error reports and analytics (cleared on logout)
  const userId = user?.id || user?._id || null;
  useEffect(() => {
    setSentryUser(userId ? { id: userId } : null);
    identifyUser(userId ? user : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, user?.orgPlan]);

  useEffect(() => {
    if (token) {
      getMeApi()
        .then((res) => setUser(res.data.user))
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  // Live: role, organization (name, icon, plan, lock) and access changes made
  // by someone else show up without a reload
  useLiveSync(['org', 'team'], () => {
    getMeApi().then((res) => setUser((prev) => (prev ? res.data.user : prev))).catch(() => {});
  }, { enabled: userId || false });

  const login = useCallback(async (email, password) => {
    const res = await loginApi(email, password);
    localStorage.setItem(TOKEN_KEY, res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  }, []);

  const signup = useCallback(async (name, email, password, invitationToken) => {
    const res = await signupApi(name, email, password, invitationToken);
    localStorage.setItem(TOKEN_KEY, res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data; // Return full response so caller can check isNewOrg
  }, []);

  const logout = useCallback(() => {
    signingOutOnPurpose();
    // End the session on the server too (fire and forget: signing out never waits)
    const current = localStorage.getItem(TOKEN_KEY);
    if (current) logoutApi(current).catch(() => {});
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // The server rotates the session on a password change and returns a new token
  const replaceToken = useCallback((nextToken) => {
    if (!nextToken) return;
    localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
  }, []);

  const updateUser = useCallback((userData) => {
    setUser((prev) => (prev ? { ...prev, ...userData } : prev));
  }, []);

  const role = user?.role;
  // Limit toasts link to billing only for people who can open it
  useEffect(() => { setBillingAccess(role === 'owner' || role === 'admin'); }, [role]);
  const orgLocked = user?.orgLocked || false;

  // Same object until something in it changes, so every useAuth() consumer
  // doesn't re-render whenever the provider does
  const value = useMemo(() => ({
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isOwner: role === 'owner',
    isAdmin: role === 'admin' || role === 'owner',
    isGuest: role === 'guest',
    canManage: role === 'owner' || role === 'admin',
    canCreate: role !== 'guest' && !orgLocked,
    orgLocked,
    login,
    signup,
    logout,
    updateUser,
    replaceToken,
  }), [user, token, loading, role, orgLocked, login, signup, logout, updateUser, replaceToken]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
