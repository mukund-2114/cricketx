import { useState, useEffect } from 'react';
import type { User } from '@/types';
import { supabase } from '@/lib/supabase';
import { formatPoints, formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface MyBetsPageProps {
  user: User;
}

interface DbBet {
  id: string;
  market_id: string;
  match_id: string;
  match_name: string;
  market_name: string;
  runner_name: string;
  runner_id: string;
  bet_type: 'back' | 'lay';
  requested_odds: number;
  matched_odds: number | null;
  stake: number;
  potential_pnl: number;
  status: string;
  pnl: number | null;
  placed_at: string;
  settled_at: string | null;
}

export default function MyBetsPage({ user }: MyBetsPageProps) {
  const [filter, setFilter] = useState<'all' | 'open' | 'matched' | 'settled'>('all');
  const [bets, setBets] = useState<DbBet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBets = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('bets')
        .select('*')
        .eq('user_id', user.id)
        .order('placed_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch bets:', error);
      } else {
        setBets(data || []);
      }
      setLoading(false);
    };

    fetchBets();

    // Realtime subscription
    const channel = supabase
      .channel('my-bets-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bets', filter: `user_id=eq.${user.id}` },
        () => fetchBets()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user.id]);

  const filtered = bets.filter(b => filter === 'all' || b.status === filter);

  return (
    <div className="min-h-screen px-4 md:px-6 py-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-extrabold text-white mb-6" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
        My Bets
      </h1>

      {/* Filters */}
      <div className="flex gap-1 bg-[hsl(222,35%,12%)] p-1 rounded-lg mb-4 w-fit">
        {(['all', 'open', 'matched', 'settled'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-1.5 text-xs font-semibold rounded-md capitalize transition-all',
              filter === f ? 'gold-gradient text-[hsl(var(--brand-navy))]' : 'text-[hsl(var(--muted-foreground))] hover:text-white'
            )}>
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="card-glass rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🏏</div>
          <p className="text-[hsl(var(--muted-foreground))]">No bets found</p>
          {filter !== 'all' && (
            <button onClick={() => setFilter('all')} className="mt-3 text-sm text-[hsl(var(--brand-gold))] hover:underline">
              Show all bets
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(bet => (
            <div key={bet.id} className={cn(
              'card-glass rounded-xl p-4',
              bet.bet_type === 'back' ? 'border-l-4 border-l-[hsl(213,90%,55%)]' : 'border-l-4 border-l-[hsl(340,85%,58%)]'
            )}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      'text-xs font-bold px-2 py-0.5 rounded',
                      bet.bet_type === 'back' ? 'bg-[hsl(213,90%,20%)] text-[hsl(213,90%,70%)]' : 'bg-[hsl(340,85%,20%)] text-[hsl(340,85%,70%)]'
                    )}>
                      {bet.bet_type.toUpperCase()}
                    </span>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded font-medium',
                      bet.status === 'matched' ? 'bg-[hsl(142,40%,12%)] text-[hsl(142,76%,55%)]' :
                      bet.status === 'settled' && bet.pnl && bet.pnl > 0 ? 'bg-[hsl(142,40%,12%)] text-[hsl(142,76%,55%)]' :
                      bet.status === 'settled' ? 'bg-[hsl(0,40%,15%)] text-[hsl(var(--destructive))]' :
                      'bg-[hsl(222,35%,16%)] text-[hsl(var(--muted-foreground))]'
                    )}>
                      {bet.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-white">{bet.runner_name}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{bet.match_name} · {bet.market_name}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-white">@ {(bet.matched_odds ?? bet.requested_odds).toFixed(2)}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">Stake: {formatPoints(bet.stake)}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-[hsl(var(--muted-foreground))]">
                <span>{formatDateTime(bet.placed_at)}</span>
                <div className="text-right">
                  {bet.status === 'settled' ? (
                    <span className={cn('font-bold', bet.pnl && bet.pnl > 0 ? 'text-[hsl(142,76%,55%)]' : 'text-[hsl(var(--destructive))]')}>
                      {bet.pnl && bet.pnl > 0 ? '+' : ''}{formatPoints(bet.pnl || 0)}
                    </span>
                  ) : (
                    <span>Potential: <span className="text-[hsl(var(--brand-gold))] font-semibold">{formatPoints(bet.potential_pnl)}</span></span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
