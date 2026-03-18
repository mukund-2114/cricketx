import { useCallback } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const { user, loading, signOut: contextSignOut, refreshUser, updateBalance, setUser, setLoading } = useAuthContext();

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, [setUser]);

  // Keep these as no-ops for backward compat with form handlers
  const login = useCallback((_email: string, _password: string) => null, []);
  const register = useCallback((_data: unknown) => {}, []);

  return { 
    user, 
    loading, 
    login, 
    register, 
    signOut, 
    refreshUser, 
    updateBalance,
    setLoading 
  };
}
