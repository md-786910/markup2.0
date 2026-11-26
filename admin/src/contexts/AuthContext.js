import React, { createContext, useState, useEffect, useCallback } from 'react';
import { TOKEN_KEY } from '../utils/constants';
import { loginApi, loginTwoFactorApi, getMeApi, logoutApi } from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // The server couldn't be reached (network, deploy, 5xx): the session is
  // kept and the app offers a retry instead of signing the admin out
  const [connectionError, setConnectionError] = useState(false);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await getMeApi();
      setUser(data.admin);
      setConnectionError(false);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        // 401: session ended (the API layer clears the token too)
        if (status === 401) localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      } else {
        setConnectionError(true);
      }
    }
    setLoading(false);
  }, []);

  const retry = useCallback(() => {
    setLoading(true);
    fetchUser();
  }, [fetchUser]);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  // Stores a session from any response that issues one (sign-in, password
  // change, turning on 2FA: the server rotates the session on those)
  const applySession = useCallback((data) => {
    if (data?.token) localStorage.setItem(TOKEN_KEY, data.token);
    if (data?.admin) setUser(data.admin);
  }, []);

  // Step 1. Returns { twoFactorRequired, challengeToken } when a code is needed
  const login = async (email, password) => {
    const { data } = await loginApi(email, password);
    if (data.twoFactorRequired) return data;
    applySession(data);
    return data;
  };

  // Step 2: authenticator or recovery code
  const completeTwoFactor = async (challengeToken, code) => {
    const { data } = await loginTwoFactorApi(challengeToken, code);
    applySession(data);
    return data;
  };

  // Ends the session on the server too, so the token can't be reused
  const logout = async () => {
    try { await logoutApi(); } catch { /* signed out locally either way */ }
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      connectionError,
      retry,
      isAuthenticated: !!user,
      login,
      completeTwoFactor,
      applySession,
      refreshUser: fetchUser,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
