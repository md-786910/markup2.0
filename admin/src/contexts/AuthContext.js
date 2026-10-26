import React, { createContext, useState, useEffect, useCallback } from 'react';
import { TOKEN_KEY } from '../utils/constants';
import { loginApi, loginTwoFactorApi, getMeApi } from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await getMeApi();
      if (data.user.role !== 'superadmin') {
        localStorage.removeItem(TOKEN_KEY);
        setUser(null);
      } else {
        setUser(data.user);
      }
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  // Stores a session from any response that issues one (sign-in, password
  // change, turning on 2FA: the server rotates the session on those)
  const applySession = useCallback((data) => {
    if (data?.user && data.user.role !== 'superadmin') {
      throw new Error('This account is not an admin account.');
    }
    if (data?.token) localStorage.setItem(TOKEN_KEY, data.token);
    if (data?.user) setUser(data.user);
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

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
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
