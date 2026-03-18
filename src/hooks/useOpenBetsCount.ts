import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Fetches and subscribes to the count of open/matched bets for the current user.
 * Returns 0 when not authenticated.
 */
export function useOpenBetsCount(userId: string | undefined): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) { setCount(0); return; }

    const fetch = async () => {
      const { count: c } = await supabase
        .from('bets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('status', ['open', 'matched']);
      setCount(c ?? 0);
    };

    fetch();

    const channel = supabase
      .channel(`open-bets-count-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bets', filter: `user_id=eq.${userId}` },
        () => fetch()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return count;
}
