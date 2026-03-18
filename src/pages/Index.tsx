import { useState, useEffect } from 'react';
import { Filter, Search } from 'lucide-react';
import type { Match } from '@/types';
import { supabase } from '@/lib/supabase';
import MatchCard from '@/components/features/MatchCard';
import LiveScoreBar from '@/components/features/LiveScoreBar';
import BetSlip from '@/components/features/BetSlip';
import heroBetting from '@/assets/hero-betting.jpg';
import { useAuth } from '@/hooks/useAuth';
import { useBetting } from '@/hooks/useBetting';

interface IndexProps {
  onAuthRequired: () => void;
}

function mapDbToMatch(dbMatch: Record<string, unknown>, markets: Record<string, unknown>[]): Match {
  const matchMarkets = markets
    .filter((m) => m.match_id === dbMatch.id)
    .map((m) => ({
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
    sport: dbMatch.sport as 'cricket' | 'football' | 'tennis',
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
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    const fetchMatches = async () => {
      const [matchesRes, marketsRes] = await Promise.all([
        supabase.from('matches').select('*').order('start_time', { ascending: true }),
        supabase.from('markets').select('*').eq('status', 'open'),
      ]);

      if (matchesRes.data && marketsRes.data && matchesRes.data.length > 0) {
        const mapped = matchesRes.data.map((m) =>
          mapDbToMatch(m as Record<string, unknown>, marketsRes.data as Record<string, unknown>[])
        );
        setMatches(mapped);
      } else if (!matchesRes.data || matchesRes.data.length === 0) {
        // No matches in DB — pull real data from SportBex
        setSeeding(true);
        try {
          console.log('[Sync] Triggering full_sync from SportBex...');
          await supabase.functions.invoke('live-sync', {
            body: { mode: 'full_sync' },
          });
        } catch (err) {
          console.error('[Sync] Error:', err);
        } finally {
          setSeeding(false);
        }
        
        // Re-fetch after seeding (regardless of success, to show what we have)
        const [m2, mk2] = await Promise.all([
          supabase.from('matches').select('*').order('start_time', { ascending: true }),
          supabase.from('markets').select('*').eq('status', 'open'),
        ]);
        if (m2.data && mk2.data) {
          setMatches(m2.data.map((m) =>
            mapDbToMatch(m as Record<string, unknown>, mk2.data as Record<string, unknown>[])
          ));
        }
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
    if (activeSport !== 'all' && m.sport !== activeSport) return false;
    if (filter === 'live' && m.status !== 'live') return false;
    if (filter === 'upcoming' && m.status !== 'upcoming') return false;
    if (search) {
      const q = search.toLowerCase();
      return m.homeTeam.toLowerCase().includes(q) || m.awayTeam.toLowerCase().includes(q) || m.series.toLowerCase().includes(q);
    }
    return true;
  });

  const sportTabs = [
    { id: 'all', label: 'All Sports', icon: '🌎' },
    { id: 'cricket', label: 'Cricket', icon: '🏏' },
    { id: 'football', label: 'Football', icon: '⚽' },
    { id: 'tennis', label: 'Tennis', icon: '🎾' },
  ];

  return (
    <div className="min-h-screen">
      <LiveScoreBar matches={matches} />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBetting} alt="IPL Betting" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-[hsl(222,47%,7%)] via-[hsl(222,47%,7%)/80%] to-transparent" />
        </div>
        <div className="relative px-4 md:px-6 py-8 md:py-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-[hsl(var(--brand-gold))/20] border border-[hsl(var(--brand-gold))/30] rounded-full px-3 py-1 mb-4">
              <span className="live-dot"></span>
              <span className="text-xs font-semibold text-[hsl(var(--brand-gold))]">Multi-Sport Exchange — Real-time Odds</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-3" style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.02em' }}>
              PREMIUM SPORTS<br />
              <span className="text-[hsl(var(--brand-gold))]">EXCHANGE 2026</span>
            </h1>
            <p className="text-sm md:text-base text-[hsl(var(--muted-foreground))] max-w-lg">
              Live markets for Cricket, Football, and Tennis. Direct SportBex integration for the most accurate back and lay odds globally.
            </p>
            <div className="flex items-center gap-4 mt-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-[hsl(var(--brand-gold))]">2%</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">Commission</div>
              </div>
              <div className="w-px h-8 bg-[hsl(222,30%,20%)]" />
              <div className="text-center">
                <div className="text-lg font-bold text-[hsl(var(--brand-gold))]">24/7</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">Live Markets</div>
              </div>
              <div className="w-px h-8 bg-[hsl(222,30%,20%)]" />
              <div className="text-center">
                <div className="text-lg font-bold text-[hsl(var(--brand-gold))]">CAD/USD/INR</div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">Currencies</div>
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
                    className={`flex-1 md:flex-none px-5 py-1.5 text-xs font-bold rounded-md capitalize transition-all ${
                      filter === f ? 'gold-gradient text-[hsl(var(--brand-navy))] shadow-lg' : 'text-[hsl(var(--muted-foreground))] hover:text-white'
                    }`}>
                    {f === 'live' && '🔴 '}{f}
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
                    try {
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
