import React, { createContext, useState, useEffect, useCallback } from 'react';
import { TOKEN_KEY } from '../utils/constants';
import { loginApi, getMeApi } from '../services/authService';

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

  const login = async (email, password) => {
    const { data } = await loginApi(email, password);
    if (data.user.role !== 'superadmin') {
      throw new Error('Access denied. Superadmin role required.');
    }
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
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
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
