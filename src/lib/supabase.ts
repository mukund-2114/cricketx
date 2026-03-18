import { createClient } from '@supabase/supabase-js';
import type { User } from '@/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Map Supabase auth user + profile to our User type
export function mapProfileToUser(profile: Record<string, unknown>): User {
  return {
    id: profile.id as string,
    email: profile.email as string,
    phone: (profile.phone as string) || '',
    name: (profile.name as string) || '',
    role: (profile.role as 'user' | 'admin') || 'user',
    pointsBalance: Number(profile.points_balance) || 0,
    currency: (profile.currency as 'CAD' | 'USD' | 'INR') || 'CAD',
    isVerified: Boolean(profile.is_verified),
    isActive: Boolean(profile.is_active),
    createdAt: profile.created_at as string,
    totalDeposited: Number(profile.total_deposited) || 0,
    totalWithdrawn: Number(profile.total_withdrawn) || 0,
    kycStatus: (profile.kyc_status as 'pending' | 'verified' | 'rejected') || 'pending',
  };
}
