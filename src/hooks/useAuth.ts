import { useCallback } from 'react';
import { useAuthContext } from '../context/AuthContext';

export function useAuth() {
  const { 
    user, 
    loading, 
    signOut: contextSignOut, 
    refreshUser, 
    updateBalance, 
    setUser, 
    setLoading,
    login: apiLogin,
    signup: apiSignup
  } = useAuthContext();

  const signOut = useCallback(async () => {
    await contextSignOut();
  }, [contextSignOut]);

  const login = useCallback(async (email: string, pass: string) => {
    return await apiLogin(email, pass);
  }, [apiLogin]);

  const register = useCallback(async (data: any) => {
    return await apiSignup(data.email, data.password, data.name);
  }, [apiSignup]);

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
