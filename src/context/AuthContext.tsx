import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import type { User } from '../types';
import { mapProfileToUser } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  updateBalance: (newBalance: number) => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  login: (email: string, pass: string) => Promise<User | null>;
  signup: (email: string, pass: string, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const BACKEND_URL = 'http://localhost:3001/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  // Synchronous recovery for instant UI response
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem('cricketx_user_proxy_v8');
    try { return cached ? JSON.parse(cached) : null; } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // Persistence side-effect
  useEffect(() => {
    if (user) localStorage.setItem('cricketx_user_proxy_v8', JSON.stringify(user));
    else localStorage.removeItem('cricketx_user_proxy_v8');
  }, [user]);

  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    // Check if we have a session stored (Simplified Auth Strategy)
    const session = localStorage.getItem('cricketx_session_v8');
    if (session) {
       // We're good, our synchronous state already loaded from cache
       console.log('[Auth] Session restored from Express proxy.');
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, pass: string) => {
    setLoading(true);
    try {
      const resp = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || 'Login failed');

      const mapped = mapProfileToUser(data.user);
      setUser(mapped);
      localStorage.setItem('cricketx_session_v8', JSON.stringify(data.session));
      return mapped;
    } catch (e) {
      console.error('[Auth] Login error:', e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, pass: string, name: string) => {
    setLoading(true);
    try {
      const resp = await fetch(`${BACKEND_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, name })
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.error || 'Signup failed');
      
      // Implicit login after signup
      await login(email, pass);
    } catch (e) {
      console.error('[Auth] Signup error:', e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [login]);

  const signOut = useCallback(async () => {
    localStorage.removeItem('cricketx_session_v8');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    // In Proxy mode, refresh logic can be expanded here to fetch from /api/auth/me
    return user;
  }, [user]);

  const updateBalance = useCallback(async (newBalance: number) => {
    if (!user) return;
    setUser(prev => prev ? { ...prev, pointsBalance: newBalance } : null);
    // Send to backend...
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser, updateBalance, setUser, setLoading, login, signup }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
