import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { User } from '../types';
import { supabase, mapProfileToUser } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  updateBalance: (newBalance: number) => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error || !data) return null;
      return mapProfileToUser(data);
    } catch (e) {
      console.error('[Auth] fetchProfile exception:', e);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // Safety timeout: if auth takes more than 15s, stop loading anyway
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('[Auth] Initialization timed out (15s), clearing loading state');
        setLoading(false);
      }
    }, 15000);

    // Global Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Global Event:', event, !!session?.user);
      if (!mounted) return;

      if (session?.user) {
        try {
          const profile = await fetchProfile(session.user.id);
          if (mounted) {
            if (profile) {
              setUser(profile);
            } else {
              // Fallback
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
                pointsBalance: 0,
                role: 'user',
                createdAt: session.user.created_at,
                phone: session.user.user_metadata?.phone || '',
                currency: 'INR',
                isVerified: true,
                isActive: true,
                totalDeposited: 0,
                totalWithdrawn: 0,
                kycStatus: 'pending'
              });
            }
          }
        } catch (err) {
          console.error("[Auth] profile fetch error:", err);
        }
      } else {
        setUser(null);
      }
      
      // Always clear loading on ANY event (don't wait for profile to finish if it's slow)
      if (mounted) setLoading(false);
    });

    // Initial check (Parallel recovery attempt)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (mounted) {
          if (profile) setUser(profile);
          // If no profile yet, but session exists, the listener above will handle fallback
        }
      }
      if (mounted) {
        setLoading(false);
        clearTimeout(safetyTimeout);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user) return null;
    const profile = await fetchProfile(user.id);
    if (profile) setUser(profile);
    return profile;
  }, [user, fetchProfile]);

  const updateBalance = useCallback(async (newBalance: number) => {
    if (!user) return;
    setUser(prev => prev ? { ...prev, pointsBalance: newBalance } : null);
    await supabase.from('profiles').update({ points_balance: newBalance }).eq('id', user.id);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser, updateBalance, setUser, setLoading }}>
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
