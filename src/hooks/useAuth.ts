import { useState, useEffect, useCallback } from 'react';
import type { User } from '@/types';
import { supabase, mapProfileToUser } from '@/lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error || !data) return null;
    return mapProfileToUser(data);
  }, []);

  useEffect(() => {
    let mounted = true;

    // Safety timeout: if auth takes more than 5s, stop loading anyway
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn('[Auth] Initialization timed out (5s), clearing loading state');
        setLoading(false);
      }
    }, 5000);

    // Initial session attempt
    supabase.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        if (error) console.error('[Auth] getSession error:', error.message);
        
        if (mounted && session?.user) {
          try {
            const profile = await fetchProfile(session.user.id);
            if (mounted) setUser(profile);
          } catch (err) {
            console.error('[Auth] Initial profile fetch error:', err);
          }
        }
      })
      .catch(err => {
        console.error('[Auth] getSession exception:', err);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
          clearTimeout(safetyTimeout);
        }
      });

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] Event:', event);
      if (!mounted) return;

      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session?.user) {
        try {
          const profile = await fetchProfile(session.user.id);
          if (mounted) setUser(profile);
        } catch (err) {
          console.error("[Auth] fetchProfile error on auth state change:", err);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      
      // Ensure loading is off if we get any auth event
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, [fetchProfile]);

  const refreshUser = useCallback(async () => {
    if (!user) return null;
    const profile = await fetchProfile(user.id);
    setUser(profile);
    return profile;
  }, [user, fetchProfile]);

  const updateBalance = useCallback(async (newBalance: number) => {
    if (!user) return;
    setUser(prev => prev ? { ...prev, pointsBalance: newBalance } : null);
    await supabase
      .from('profiles')
      .update({ points_balance: newBalance })
      .eq('id', user.id);
  }, [user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  // login/register are handled by AuthModal directly via supabase.auth
  // These are kept as no-ops for backward compat with App.tsx
  const login = useCallback((_email: string, _password: string) => null, []);
  const register = useCallback((_data: unknown) => {}, []);

  return { user, loading, login, register, signOut, refreshUser, updateBalance };
}
