import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { auth, signInWithEmailAndPassword, signOut } from '../config/firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('stockwise_user') || localStorage.getItem('supplywise_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('stockwise_token') || localStorage.getItem('supplywise_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('stockwise_token') || localStorage.getItem('supplywise_token');
      if (storedToken) {
        try {
          const res = await authService.getMe();
          if (res.success && res.data.user) {
            setUser(res.data.user);
            localStorage.setItem('stockwise_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.error('[AuthContext] Token validation failed:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    let firebaseToken = null;
    try {
      if (auth) {
        const fbPromise = signInWithEmailAndPassword(auth, email, password).then((u) => u.user.getIdToken());
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase auth timeout')), 1000));
        firebaseToken = await Promise.race([fbPromise, timeoutPromise]).catch(() => null);
      }
    } catch (fbErr) {
      console.info('[AuthContext] Firebase client sign-in info:', fbErr.message);
    }

    const res = await authService.login({ email, password, idToken: firebaseToken });
    if (res.success && res.data) {
      const activeToken = res.data.token || firebaseToken;
      setUser(res.data.user);
      setToken(activeToken);
      localStorage.setItem('stockwise_token', activeToken);
      localStorage.setItem('stockwise_user', JSON.stringify(res.data.user));
      return res.data.user;
    }
    throw new Error(res.message || 'Login failed');
  };

  const register = async (userData) => {
    const res = await authService.register(userData);
    if (res.success && res.data) {
      setUser(res.data.user);
      setToken(res.data.token);
      localStorage.setItem('stockwise_token', res.data.token);
      localStorage.setItem('stockwise_user', JSON.stringify(res.data.user));
      return res.data.user;
    }
    throw new Error(res.message || 'Registration failed');
  };

  const logout = () => {
    try {
      if (auth) signOut(auth).catch(() => {});
    } catch (e) {}
    authService.logout();
    setUser(null);
    setToken(null);
    localStorage.removeItem('stockwise_token');
    localStorage.removeItem('stockwise_user');
    localStorage.removeItem('supplywise_token');
    localStorage.removeItem('supplywise_user');
  };

  // Helper for demo role quick switching
  const quickDemoLogin = async (roleType) => {
    const credentialsMap = {
      DISTRIBUTION_MANAGER: { email: 'manager@stockwise.ai', password: 'password123' },
      WAREHOUSE: { email: 'warehouse1@stockwise.ai', password: 'password123' },
      STORE_MANAGER: { email: 'store1@stockwise.ai', password: 'password123' },
    };

    const creds = credentialsMap[roleType];
    if (creds) {
      return await login(creds.email, creds.password);
    }
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
    quickDemoLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
