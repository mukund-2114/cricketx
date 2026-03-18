
import { useState, useEffect, useRef, useCallback } from 'react';
import type { Market } from '@/types';
import { supabase } from '@/lib/supabase';

interface UseOddsPollerOptions {
  matchId: string | undefined;
  /** Interval in ms to call live-sync edge function (default 30000) */
  pollIntervalMs?: number;
  enabled?: boolean;
}

/**
 * Polls the live-sync edge function on an interval to trigger
 * SportBex odds updates, which then propagate via Supabase Realtime.
 */
export function useOddsPoller({ matchId, pollIntervalMs = 30000, enabled = true }: UseOddsPollerOptions) {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [polling, setPolling] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const trigger = useCallback(async () => {
    if (!matchId || polling) return;
    setPolling(true);
    try {
      const { data } = await supabase.functions.invoke('live-sync', {
        body: { mode: 'update_odds' },
      });
      if (data?.success) {
        setLastUpdated(new Date());
        console.log(`[OddsPoller] Updated — api:${data.api_updated} sim:${data.simulated_updated}`);
      }
    } catch (e) {
      console.warn('[OddsPoller] Poll failed:', e);
    } finally {
      setPolling(false);
    }
  }, [matchId, polling]);

  useEffect(() => {
    if (!enabled || !matchId) return;

    // Immediate first call
    trigger();

    timerRef.current = setInterval(trigger, pollIntervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, matchId, pollIntervalMs, trigger]); // Added 'trigger' to the dependency array

  return { lastUpdated, polling, triggerNow: trigger };
}

/**
 * mapDbMarket — converts a raw Supabase market row to the Market type.
 */
function mapDbMarket(m: Record<string, unknown>): Market {
  const runners = Array.isArray(m.runners) ? m.runners : [];

  // Normalise runners: ensure backOdds/layOdds are always arrays of OddsLevel
  const normRunners = runners.map((r: Record<string, unknown>) => {
    const ensureLadder = (v: unknown, fallback: number): { price: number; size: number }[] => {
      if (Array.isArray(v) && v.length > 0 && typeof (v[0] as Record<string, unknown>).price === 'number') return v as { price: number; size: number }[];
      // v is a plain number (legacy schema) — build 3-level ladder
      const base = typeof v === 'number' ? v : fallback;
      return [
        { price: base, size: 150000 },
        { price: +(base - 0.02).toFixed(2), size: 80000 },
        { price: +(base - 0.04).toFixed(2), size: 40000 },
      ];
    };
    const ltp = Number(r.lastTradedPrice ?? (r.backOdds as { price: number }[])?.[0]?.price ?? 2.0);
    return {
      id: String(r.id ?? ''),
      name: String(r.name ?? ''),
      backOdds: ensureLadder(r.backOdds, ltp),
      layOdds: ensureLadder(r.layOdds, +(ltp + 0.02).toFixed(2)),
      lastTradedPrice: ltp,
      status: (r.status as 'active' | 'winner' | 'loser' | 'removed') ?? 'active',
      sort: Number(r.sort ?? 0),
    };
  });

  return {
    id: m.id as string,
    matchId: m.match_id as string,
    name: m.name as string,
    type: m.type as 'match_odds' | 'fancy' | 'over_under',
    status: m.status as 'open' | 'suspended' | 'closed' | 'settled',
    runners: normRunners,
    inPlay: Boolean(m.in_play),
    startTime: m.start_time as string,
    settlementTime: m.settlement_time as string | undefined,
    minBet: Number(m.min_bet),
    maxBet: Number(m.max_bet),
    fancyQuestion: m.fancy_question as string | undefined,
    fancyLine: m.fancy_line ? Number(m.fancy_line) : undefined,
    fancyYesOdds: m.fancy_yes_odds ? Number(m.fancy_yes_odds) : undefined,
    fancyNoOdds: m.fancy_no_odds ? Number(m.fancy_no_odds) : undefined,
  };
}

interface UseLiveMarketsResult {
  markets: Market[];
  loading: boolean;
  lastUpdated: Date | null;
  polling: boolean;
  refresh: () => Promise<void>;
}

/**
 * useLiveMarkets — combines:
 *  1. Initial DB fetch for a match's markets
 *  2. Supabase Realtime subscription for instant push updates
 *  3. useOddsPoller to trigger SportBex odds every 30 seconds
 */
export function useLiveMarkets(matchId: string | undefined): UseLiveMarketsResult {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMarkets = useCallback(async () => {
    if (!matchId) return;
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .eq('match_id', matchId)
      .eq('status', 'open')
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMarkets(data.map(m => mapDbMarket(m as Record<string, unknown>)));
    }
    setLoading(false);
  }, [matchId]);

  // Initial fetch
  useEffect(() => {
    if (!matchId) { setLoading(false); return; }
    setLoading(true);
    fetchMarkets();
  }, [matchId, fetchMarkets]);

  // Supabase Realtime — listen for market updates on this match
  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`live-markets-${matchId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'markets',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          // Patch only the changed market to avoid full refetch
          const updated = mapDbMarket(payload.new as Record<string, unknown>);
          setMarkets(prev =>
            prev.map(m => m.id === updated.id ? updated : m)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'markets',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const inserted = mapDbMarket(payload.new as Record<string, unknown>);
          setMarkets(prev =>
            prev.find(m => m.id === inserted.id) ? prev : [...prev, inserted]
          );
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] markets channel status: ${status}`);
      });

    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  // Background polling — triggers live-sync every 30s
  const { lastUpdated, polling, triggerNow } = useOddsPoller({
    matchId,
    pollIntervalMs: 30000,
    enabled: !!matchId,
  });

  return { markets, loading, lastUpdated, polling, refresh: triggerNow };
}

/**
 * Legacy export — kept for backward compatibility.
 * Now just returns the markets as-is (Realtime handles updates).
 */
export function useLiveOdds(markets: Market[]): Market[] {
  return markets;
}
