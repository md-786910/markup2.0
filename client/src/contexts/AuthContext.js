import React, { createContext, useState, useEffect, useCallback } from 'react';
import { TOKEN_KEY } from '../utils/constants';
import { loginApi, signupApi, getMeApi } from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

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

  const login = useCallback(async (email, password) => {
    const res = await loginApi(email, password);
    localStorage.setItem(TOKEN_KEY, res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  }, []);

  const signup = useCallback(async (name, email, password) => {
    const res = await signupApi(name, email, password);
    localStorage.setItem(TOKEN_KEY, res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
    return res.data; // Return full response so caller can check isNewOrg
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((userData) => {
    setUser((prev) => (prev ? { ...prev, ...userData } : prev));
  }, []);

  const role = user?.role;
  const orgLocked = user?.orgLocked || false;

  return (
    <AuthContext.Provider value={{
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
    }}>
      {children}
    </AuthContext.Provider>
  );
}
