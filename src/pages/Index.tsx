import { useState, useEffect } from 'react';
import { Filter, Search } from 'lucide-react';
import type { Match } from '@/types';
import { supabase } from '@/lib/supabase';
import MatchCard from '@/components/features/MatchCard';
import LiveScoreBar from '@/components/features/LiveScoreBar';
import BetSlip from '@/components/features/BetSlip';
// Professional hero background
const heroBettingPro = 'https://imgur.com/v8tT9B0.png'; // Placeholder for the actual generated image below
import { useAuth } from '@/hooks/useAuth';
import { useBetting } from '@/hooks/useBetting';

interface IndexProps {
  onAuthRequired: () => void;
}

function mapDbToMatch(dbMatch: Record<string, unknown>, markets: Record<string, unknown>[]): Match {
  const matchMarkets = markets.map((m) => ({
      id: m.id as string,
      matchId: m.match_id as string,
      name: m.name as string,
      type: m.type as 'match_odds' | 'fancy' | 'over_under',
      status: m.status as 'open' | 'suspended' | 'closed' | 'settled',
      runners: Array.isArray(m.runners) ? m.runners : [],
      inPlay: Boolean(m.in_play),
      startTime: m.start_time as string,
      settlementTime: m.settlement_time as string | undefined,
      minBet: Number(m.min_bet),
      maxBet: Number(m.max_bet),
      fancyQuestion: m.fancy_question as string | undefined,
      fancyLine: m.fancy_line ? Number(m.fancy_line) : undefined,
      fancyYesOdds: m.fancy_yes_odds ? Number(m.fancy_yes_odds) : undefined,
      fancyNoOdds: m.fancy_no_odds ? Number(m.fancy_no_odds) : undefined,
    }));

  return {
    id: dbMatch.id as string,
    series: dbMatch.series as string,
    homeTeam: dbMatch.home_team as string,
    awayTeam: dbMatch.away_team as string,
    venue: dbMatch.venue as string,
    startTime: dbMatch.start_time as string,
    status: dbMatch.status as 'upcoming' | 'live' | 'completed',
    score: dbMatch.score as Match['score'],
    sport: dbMatch.sport as string,
    sportGroup: dbMatch.sport_group as string,
    sportKey: dbMatch.sport_key as string,
    region: dbMatch.region as string,
    markets: matchMarkets,
  };
}

export default function Index({ onAuthRequired }: IndexProps) {
  const { user, updateBalance } = useAuth();
  const { betSlip, addToBetSlip, removeBetSlipItem, updateStake, clearBetSlip, placeBets, isPlacing } = useBetting(user, updateBalance);
  const [seeding, setSeeding] = useState(false);
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming'>('all');
  const [activeSport, setActiveSport] = useState<'cricket' | 'football' | 'tennis' | 'all'>('all');
  const [search, setSearch] = useState('');
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        console.log('[Sync] Fetching from Express Backend...');
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const res = await fetch(`${backendUrl}/api/matches`);
        if (!res.ok) throw new Error('Backend offline');
        const data = await res.json();
        
        if (data && data.matches) {
          const mapped = data.matches.map((m: any) =>
            mapDbToMatch(m as Record<string, unknown>, (m.markets || []) as Record<string, unknown>[])
          );
          setMatches(mapped);
          setSystemStatus(data.status);
          if (data.groups) setAvailableGroups(data.groups);
          return;
        }
      } catch (err) {
        console.warn('[Sync] Backend failed, falling back to direct Supabase:', err.message);
      }

      // Fallback: Direct Supabase from DB only
      const [matchesRes, marketsRes] = await Promise.all([
        supabase.from('matches').select('*').order('start_time', { ascending: true }),
        supabase.from('markets').select('*').eq('status', 'open'),
      ]);

      if (matchesRes.data && marketsRes.data && matchesRes.data.length > 0) {
        const mapped = matchesRes.data.map((m) =>
          mapDbToMatch(m as Record<string, unknown>, marketsRes.data as Record<string, unknown>[])
        );
        setMatches(mapped);
      }
    };

    fetchMatches();

    // Realtime subscription for live odds updates
    const channel = supabase
      .channel('live-markets')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'markets' }, () => fetchMatches())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches' }, () => fetchMatches())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredMatches = matches.filter(m => {
    if (activeSport !== 'all' && m.sportGroup !== activeSport) return false;
    if (filter === 'live' && m.status !== 'live') return false;
    if (filter === 'upcoming' && m.status !== 'upcoming') return false;
    if (search) {
      const q = search.toLowerCase();
      return m.homeTeam.toLowerCase().includes(q) || m.awayTeam.toLowerCase().includes(q) || m.series.toLowerCase().includes(q);
    }
    return true;
  });

  const liveCount = matches.filter(m => m.status === 'live').length;

  const sportTabs = [
    { id: 'all', label: 'Global Feed', icon: '🌎' },
    ...availableGroups.map(group => ({
      id: group,
      label: group,
      icon: group.includes('Cricket') ? '🏏' : (group.includes('Soccer') ? '⚽' : (group.includes('Tennis') ? '🎾' : '🏀'))
    }))
  ];

  return (
    <div className="min-h-screen">
      <LiveScoreBar matches={matches} />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div 
             className="w-full h-full bg-cover bg-center opacity-30 mix-blend-overlay" 
             style={{ backgroundImage: `url('/C:/Users/asava/.gemini/antigravity/brain/f99abebf-8cc7-459e-8296-55262588c715/hero_betting_pro_jpg_1773887995443.png')` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[hsl(222,47%,7%)] via-transparent to-[hsl(222,47%,7%)/40%]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(222,47%,7%)] via-[hsl(222,47%,7%)/60%] to-transparent" />
        </div>
        <div className="relative px-4 md:px-6 py-8 md:py-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-[hsl(var(--brand-gold))/20] border border-[hsl(var(--brand-gold))/30] rounded-full px-3 py-1 mb-4">
              <span className="live-dot"></span>
              <span className="text-xs font-semibold text-[hsl(var(--brand-gold))] uppercase tracking-widest">Institutional Grade Liquidity — Elite Sports Exchange</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-white mb-4 uppercase tracking-tight" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              THE WORLD'S MOST<br />
              <span className="text-[hsl(var(--brand-gold))]">LIQUID EXCHANGE 2026</span>
            </h1>
            <p className="text-sm md:text-lg text-[hsl(var(--muted-foreground))] max-w-xl leading-relaxed">
              Trade Cricket, Football, and Tennis markets with real-time liquidity. Direct data pipelines from The Odds API & SportBex for high-frequency betting and arbitrage.
            </p>
            <div className="flex items-center gap-4 mt-4 text-sm">
              <div className="text-center">
                <div className="text-xl font-black text-white">$2.4B+</div>
                <div className="text-[10px] uppercase tracking-tighter text-[hsl(var(--muted-foreground))]">Annual Volume</div>
              </div>
              <div className="w-px h-8 bg-[hsl(222,30%,20%)]" />
              <div className="text-center">
                <div className="text-xl font-black text-white">0.05s</div>
                <div className="text-[10px] uppercase tracking-tighter text-[hsl(var(--muted-foreground))]">Order Match</div>
              </div>
              <div className="w-px h-8 bg-[hsl(222,30%,20%)]" />
              <div className="text-center">
                <div className="text-xl font-black text-white">DIRECT</div>
                <div className="text-[10px] uppercase tracking-tighter text-[hsl(var(--muted-foreground))]">API Access</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="px-3 md:px-6 pb-24 md:pb-6">
        <div className="flex flex-col lg:flex-row gap-4 max-w-[1400px] mx-auto">
          {/* Matches column */}
          <div className="flex-1 min-w-0">
            {/* Sport Category Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              {sportTabs.map(sport => (
                <button
                  key={sport.id}
                  onClick={() => setActiveSport(sport.id as any)}
                  className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                    activeSport === sport.id
                      ? 'bg-[hsl(var(--brand-gold))] border-[hsl(var(--brand-gold))] text-[hsl(var(--brand-navy))] shadow-[0_0_15px_rgba(212,175,55,0.3)]'
                      : 'bg-[hsl(222,35%,12%)] border-[hsl(222,30%,20%)] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--brand-gold))/40] hover:text-white'
                  }`}
                >
                  <span className="text-lg">{sport.icon}</span>
                  <span className="text-sm font-bold whitespace-nowrap">{sport.label}</span>
                </button>
              ))}
            </div>

            {/* Sub-Filter bar */}
            <div className="flex flex-col md:flex-row items-center gap-3 mb-6">
              <div className="flex bg-[hsl(222,35%,12%)] rounded-lg p-1 w-full md:w-auto">
                {(['all', 'live', 'upcoming'] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`flex-1 md:flex-none px-5 py-1.5 text-xs font-bold rounded-md capitalize transition-all flex items-center justify-center gap-2 ${
                      filter === f ? 'gold-gradient text-[hsl(var(--brand-navy))] shadow-lg' : 'text-[hsl(var(--muted-foreground))] hover:text-white'
                    }`}>
                    {f === 'live' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                    {f}
                    {f === 'live' && liveCount > 0 && (
                      <span className="bg-red-500/20 text-red-500 text-[10px] px-1.5 py-0.5 rounded-full">{liveCount}</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex-1 flex items-center bg-[hsl(222,35%,12%)] border border-[hsl(222,30%,18%)] rounded-lg px-3 py-2 gap-2 w-full">
                <Search size={16} className="text-[hsl(var(--muted-foreground))]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search sports, teams, or leagues..."
                  className="bg-transparent text-sm text-white placeholder-[hsl(var(--muted-foreground))] focus:outline-none flex-1"
                />
              </div>
            </div>

            {/* Current Context label */}
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-lg font-bold text-white capitalize">
                {activeSport === 'all' ? 'Featured Matches' : `${activeSport} Events`}
              </h2>
              <div className="h-px flex-1 bg-[hsl(222,30%,15%)]" />
              <div className="text-[10px] uppercase tracking-tighter text-[hsl(var(--muted-foreground))] font-bold">
                Showing {filteredMatches.length} Matches
              </div>
            </div>

            {seeding ? (
              <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
                <div className="w-8 h-8 gold-gradient rounded-lg animate-pulse mx-auto mb-3" />
                <p className="text-sm">Loading IPL matches...</p>
              </div>
            ) : filteredMatches.length === 0 ? (
              <div className="text-center py-20 card-glass rounded-2xl border-dashed border-2 border-[hsl(222,30%,15%)]">
                <div className="text-5xl mb-4">🏆</div>
                <h3 className="text-lg font-bold text-white mb-1">No Matches Available</h3>
                <p className="text-[hsl(var(--muted-foreground))] text-sm">Targeting real-time feed from SportBex...</p>
                <button 
                  onClick={async () => {
                    setSeeding(true);
                    console.log('[Sync] Requesting server-side sync Discovery...');
                    try {
                      const res = await fetch('http://localhost:3001/api/sync/force', { method: 'POST' });
                      if (res.ok) {
                        window.location.reload();
                        return;
                      }
                      // Fallback: Supabase Edge Function
                      await supabase.functions.invoke('live-sync', { body: { mode: 'full_sync', force: true } });
                      window.location.reload();
                    } catch (err) {
                      console.error('Manual sync failed:', err);
                    } finally {
                      setSeeding(false);
                    }
                  }}
                  disabled={seeding}
                  className="mt-6 px-6 py-2 bg-[hsl(222,35%,12%)] border border-[hsl(222,30%,20%)] rounded-lg text-sm font-semibold text-white hover:bg-[hsl(222,35%,16%)] transition-all disabled:opacity-50"
                >
                  {seeding ? 'Syncing...' : 'Force Refresh Feed'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMatches.map(match => (
                  <MatchCard key={match.id} match={match} onAddToBetSlip={addToBetSlip} />
                ))}
              </div>
            )}
          </div>

          {/* Bet Slip — desktop sidebar */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-[70px]">
              <BetSlip
                items={betSlip}
                user={user}
                isPlacing={isPlacing}
                onRemove={removeBetSlipItem}
                onStakeChange={updateStake}
                onPlaceBets={placeBets}
                onClear={clearBetSlip}
                onAuthRequired={onAuthRequired}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bet slip fab */}
      {betSlip.length > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
          <div className="card-glass rounded-xl shadow-2xl">
            <BetSlip
              items={betSlip}
              user={user}
              isPlacing={isPlacing}
              onRemove={removeBetSlipItem}
              onStakeChange={updateStake}
              onPlaceBets={placeBets}
              onClear={clearBetSlip}
              onAuthRequired={onAuthRequired}
            />
          </div>
        </div>
      )}
    </div>
  );
}
