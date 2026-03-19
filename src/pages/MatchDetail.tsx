import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, RefreshCw, Wifi } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useLiveMarkets } from '@/hooks/useLiveOdds';
import BetSlip from '@/components/features/BetSlip';
import type { BetSlipItem, Match } from '@/types';
import { formatPoints, formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useBetting } from '@/hooks/useBetting';
import { toast } from 'sonner';

interface MatchDetailProps {
  onAuthRequired: () => void;
}

export default function MatchDetail({ onAuthRequired }: MatchDetailProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, updateBalance } = useAuth();
  const { betSlip, addToBetSlip, removeBetSlipItem, updateStake, clearBetSlip, placeBets, isPlacing } = useBetting(user, updateBalance);
  const [activeTab, setActiveTab] = useState<'markets' | 'scorecard' | 'stats'>('markets');
  const [match, setMatch] = useState<Match | null>(null);
  const [loadingMatch, setLoadingMatch] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // ── Live markets via Realtime + polling ──────────────────────────
  const { markets, loading: loadingMarkets, lastUpdated, polling, refresh } = useLiveMarkets(id);

  // ── Fetch detailed match data from Express ───────────────────────
  const fetchMatch = useCallback(async () => {
    if (!id) return;
    try {
      setLoadingMatch(true);
      const res = await fetch(`http://localhost:3001/api/matches/${id}`);
      if (!res.ok) throw new Error('Match not found');
      const data = await res.json();
      
      setMatch({
        id: data.id,
        series: data.series,
        homeTeam: data.home_team,
        awayTeam: data.away_team,
        venue: data.venue,
        startTime: data.start_time,
        status: data.status,
        score: data.score,
        sport: data.sport as 'cricket' | 'football' | 'tennis',
        markets: data.markets || [],
      });
    } catch (err) {
      console.error('[Detail] Error fetching match:', err);
      toast.error('Failed to load live match data');
    } finally {
      setLoadingMatch(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMatch();
    // Auto-refresh match data every 60 seconds for live odds
    const interval = setInterval(fetchMatch, 60000);
    return () => clearInterval(interval);
  }, [id, fetchMatch]);

  const handleOddsClick = (item: BetSlipItem) => addToBetSlip(item);

  const loading = loadingMatch;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 gold-gradient rounded-xl animate-pulse mx-auto" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Loading match...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl">🏏</div>
          <p className="text-[hsl(var(--muted-foreground))]">Match not found</p>
          <button
            onClick={() => {
              setSeeding(true);
              fetch('http://localhost:3001/api/sync/force', { method: 'POST' })
                .then(() => navigate('/'))
                .finally(() => setSeeding(false));
            }}
            disabled={seeding}
            className="gold-gradient text-[hsl(var(--brand-navy))] px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {seeding ? 'Syncing...' : 'Fetch Live Data'}
          </button>
          <br />
          <button onClick={() => navigate('/')} className="text-[hsl(var(--brand-gold))] hover:underline text-sm">
            Back to matches
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Match header */}
      <div className="navy-gradient border-b border-[hsl(222,30%,15%)] px-4 md:px-6 py-4">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-[hsl(var(--muted-foreground))] hover:text-white transition-colors mb-3 text-sm">
          <ArrowLeft size={16} /> Back to matches
        </button>
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">{match.series}</span>
              {match.status === 'live' && (
                <div className="flex items-center gap-1 bg-[hsl(142,40%,10%)] border border-[hsl(142,40%,20%)] rounded px-2 py-0.5">
                  <span className="live-dot"></span>
                  <span className="text-xs font-bold text-[hsl(142,76%,55%)]">LIVE</span>
                </div>
              )}
              {/* Realtime status */}
              <div className={cn(
                'flex items-center gap-1 rounded px-2 py-0.5 border text-xs font-medium',
                polling
                  ? 'bg-[hsl(43,40%,8%)] border-[hsl(43,40%,20%)] text-[hsl(var(--brand-gold))]'
                  : 'bg-[hsl(222,35%,10%)] border-[hsl(222,30%,18%)] text-[hsl(var(--muted-foreground))]'
              )}>
                <Wifi size={10} className={polling ? 'animate-pulse' : ''} />
                {polling ? 'Updating odds...' : lastUpdated ? `Updated ${Math.round((Date.now() - lastUpdated.getTime()) / 1000)}s ago` : 'Live odds'}
              </div>
            </div>
            <h1 className="text-xl md:text-3xl font-extrabold text-white" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
              {match.homeTeam} <span className="text-[hsl(var(--muted-foreground))]">vs</span> {match.awayTeam}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              <span className="flex items-center gap-1">
                {match.sport === 'cricket' ? '🏏' : match.sport === 'football' ? '⚽' : '🎾'}
                {match.venue}
              </span>
              <span className="flex items-center gap-1"><Clock size={11} />{formatDateTime(match.startTime)}</span>
            </div>
          </div>

          {/* Manual refresh + scoreboard */}
          <div className="flex items-start gap-3">
            <button
              onClick={() => { refresh(); }}
              disabled={polling}
              className="p-2 rounded-lg bg-[hsl(222,35%,12%)] border border-[hsl(222,30%,20%)] text-[hsl(var(--muted-foreground))] hover:text-white hover:border-[hsl(var(--brand-gold))] transition-all disabled:opacity-50"
              title="Refresh odds"
            >
              <RefreshCw size={14} className={polling ? 'animate-spin' : ''} />
            </button>

            {match.status === 'live' && match.score && match.sport === 'cricket' && (
              <div className="card-glass rounded-xl px-4 py-3 min-w-[200px] border-l-4 border-l-[hsl(var(--brand-gold))]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{match.homeTeam.split(' ').pop()}</span>
                  <span className="text-lg font-extrabold text-[hsl(var(--brand-gold))]">
                    {match.score.homeRuns}/{match.score.homeWickets}
                  </span>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">({match.score.homeOvers})</span>
                </div>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))] space-y-0.5">
                  <div className="truncate">{match.score.currentBatsman1}*</div>
                  <div className="truncate">{match.score.currentBowler}</div>
                </div>
              </div>
            )}

            {match.status === 'live' && match.sport !== 'cricket' && (
              <div className="card-glass rounded-xl px-4 py-3 min-w-[150px] flex items-center justify-center border-l-4 border-l-[hsl(var(--brand-gold))]">
                <div className="text-center">
                  <div className="text-xs font-bold text-[hsl(var(--muted-foreground))] uppercase mb-1">Live Score</div>
                  <div className="text-xl font-black text-white tracking-widest">
                    {match.score?.homeRuns ?? 0} — {match.score?.awayRuns ?? 0}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-4">
        <div className="flex flex-col lg:flex-row gap-4 max-w-[1400px] mx-auto">
          {/* Markets column */}
          <div className="flex-1 min-w-0">
            <div className="flex gap-1 bg-[hsl(222,35%,12%)] p-1 rounded-lg mb-4 w-fit">
              {(['markets', 'scorecard', 'stats'] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={cn(
                    'px-4 py-1.5 text-xs font-semibold rounded-md capitalize transition-all',
                    activeTab === t ? 'gold-gradient text-[hsl(var(--brand-navy))]' : 'text-[hsl(var(--muted-foreground))] hover:text-white'
                  )}>
                  {t}
                </button>
              ))}
            </div>

            {/* ── Markets tab ── */}
            {activeTab === 'markets' && (
              <div className="space-y-4">
                {markets.length === 0 && (
                  <div className="card-glass rounded-xl p-8 text-center text-[hsl(var(--muted-foreground))]">
                    <div className="text-4xl mb-3">🏏</div>
                    <p className="mb-3">No open markets for this match yet</p>
                    <button
                      onClick={() => refresh()}
                      disabled={polling}
                      className="text-sm text-[hsl(var(--brand-gold))] hover:underline disabled:opacity-50"
                    >
                      {polling ? 'Checking...' : 'Refresh from SportBex →'}
                    </button>
                  </div>
                )}

                {markets.map(market => (
                  <div key={market.id} className="card-glass rounded-xl overflow-hidden">
                    {/* Market header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[hsl(222,40%,9%)] border-b border-[hsl(222,30%,15%)]">
                      <div>
                        <h3 className="text-sm font-bold text-white">{market.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                          <span>{market.type === 'match_odds' ? 'Exchange' : market.type === 'fancy' ? 'Fancy' : 'Over/Under'}</span>
                          {market.inPlay && (
                            <span className="flex items-center gap-1 text-[hsl(142,76%,55%)]">
                              <span className="live-dot" style={{ width: 6, height: 6 }}></span>In-Play
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-[hsl(var(--muted-foreground))]">
                        Min: {formatPoints(market.minBet)} | Max: {formatPoints(market.maxBet)}
                      </div>
                    </div>

                    <div className="p-4">
                      {/* ── Match odds (exchange) ── */}
                      {market.type === 'match_odds' && (
                        <>
                          <div className="flex items-center mb-2">
                            <div className="flex-1 text-xs text-[hsl(var(--muted-foreground))]">Runner</div>
                            <div className="flex gap-1">
                              {['', '', 'Back'].map((l, i) => (
                                <div key={i} className={cn(
                                  'w-16 text-center text-xs font-bold',
                                  i === 2 ? 'text-[hsl(213,90%,65%)]' : 'text-[hsl(var(--muted-foreground))]'
                                )}>{l}</div>
                              ))}
                              {['Lay', '', ''].map((l, i) => (
                                <div key={i} className={cn(
                                  'w-16 text-center text-xs font-bold',
                                  i === 0 ? 'text-[hsl(340,85%,65%)]' : 'text-[hsl(var(--muted-foreground))]'
                                )}>{l}</div>
                              ))}
                            </div>
                          </div>

                          {market.runners.map(runner => (
                            <div key={runner.id} className="flex items-center py-2 border-t border-[hsl(222,30%,15%)]">
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-white">{runner.name}</div>
                                <div className="text-xs text-[hsl(var(--muted-foreground))]">
                                  LTP: <span className="text-white font-medium">{runner.lastTradedPrice.toFixed(2)}</span>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                {runner.backOdds.slice(0, 3).reverse().map((o: { price: number; size: number }, i: number) => (
                                  <button key={i}
                                    onClick={() => handleOddsClick({
                                      marketId: market.id, matchId: match.id,
                                      matchName: `${match.homeTeam} vs ${match.awayTeam}`,
                                      marketName: market.name,
                                      runnerId: runner.id, runnerName: runner.name,
                                      betType: 'back', odds: o.price, stake: 0,
                                    })}
                                    className={cn('odds-cell w-16', i === 2 ? 'back-btn' : 'bg-[hsl(213,90%,12%)] hover:bg-[hsl(213,90%,18%)]')}>
                                    <div className={cn('text-xs font-bold', i === 2 ? 'text-white' : 'text-[hsl(213,90%,65%)]')}>
                                      {o.price.toFixed(2)}
                                    </div>
                                    <div className="text-[9px] opacity-70 text-[hsl(213,90%,75%)]">
                                      {formatPoints(o.size).replace(' pts', '')}
                                    </div>
                                  </button>
                                ))}
                                {runner.layOdds.slice(0, 3).map((o: { price: number; size: number }, i: number) => (
                                  <button key={i}
                                    onClick={() => handleOddsClick({
                                      marketId: market.id, matchId: match.id,
                                      matchName: `${match.homeTeam} vs ${match.awayTeam}`,
                                      marketName: market.name,
                                      runnerId: runner.id, runnerName: runner.name,
                                      betType: 'lay', odds: o.price, stake: 0,
                                    })}
                                    className={cn('odds-cell w-16', i === 0 ? 'lay-btn' : 'bg-[hsl(340,85%,10%)] hover:bg-[hsl(340,85%,16%)]')}>
                                    <div className={cn('text-xs font-bold', i === 0 ? 'text-white' : 'text-[hsl(340,85%,65%)]')}>
                                      {o.price.toFixed(2)}
                                    </div>
                                    <div className="text-[9px] opacity-70 text-[hsl(340,85%,75%)]">
                                      {formatPoints(o.size).replace(' pts', '')}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {/* ── Fancy market ── */}
                      {market.type === 'fancy' && (
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">{market.fancyQuestion}</div>
                            <div className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                              Line: <span className="text-[hsl(var(--brand-gold))] font-bold">{market.fancyLine}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleOddsClick({
                                marketId: market.id, matchId: match.id,
                                matchName: `${match.homeTeam} vs ${match.awayTeam}`,
                                marketName: `${market.name} - No`,
                                runnerId: 'no',
                                runnerName: `${market.fancyQuestion} No (< ${market.fancyLine})`,
                                betType: 'back', odds: market.fancyNoOdds!, stake: 0,
                              })}
                              className="lay-btn odds-cell w-20 text-center">
                              <div className="text-xs text-[hsl(340,85%,75%)] mb-0.5">No</div>
                              <div className="text-sm font-bold text-white">{market.fancyNoOdds?.toFixed(2)}</div>
                            </button>
                            <button
                              onClick={() => handleOddsClick({
                                marketId: market.id, matchId: match.id,
                                matchName: `${match.homeTeam} vs ${match.awayTeam}`,
                                marketName: `${market.name} - Yes`,
                                runnerId: 'yes',
                                runnerName: `${market.fancyQuestion} Yes (> ${market.fancyLine})`,
                                betType: 'back', odds: market.fancyYesOdds!, stake: 0,
                              })}
                              className="back-btn odds-cell w-20 text-center">
                              <div className="text-xs text-[hsl(213,90%,75%)] mb-0.5">Yes</div>
                              <div className="text-sm font-bold text-white">{market.fancyYesOdds?.toFixed(2)}</div>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Scorecard tab ── */}
            {activeTab === 'scorecard' && (
              <div className="card-glass rounded-xl p-6 text-center">
                <div className="text-4xl mb-3">🏏</div>
                {match.status === 'live' && match.score ? (
                  <div className="space-y-4">
                    <div className="text-2xl font-bold text-[hsl(var(--brand-gold))]" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {match.homeTeam}: {match.score.homeRuns}/{match.score.homeWickets} ({match.score.homeOvers})
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                      <div className="card-glass rounded-lg p-3">
                        <div className="text-[hsl(var(--muted-foreground))] text-xs mb-1">Current Run Rate</div>
                        <div className="text-xl font-bold text-white">{match.score.currRunRate}</div>
                      </div>
                      <div className="card-glass rounded-lg p-3">
                        <div className="text-[hsl(var(--muted-foreground))] text-xs mb-1">Last Ball</div>
                        <div className="text-xl font-bold text-[hsl(var(--brand-gold))]">{match.score.lastBallResult}</div>
                      </div>
                    </div>
                    <div className="text-sm text-[hsl(var(--muted-foreground))]">
                      <p>Batting: {match.score.currentBatsman1}, {match.score.currentBatsman2}</p>
                      <p>Bowling: {match.score.currentBowler}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[hsl(var(--muted-foreground))]">Scorecard available when match is live</p>
                )}
              </div>
            )}

            {/* ── Stats tab ── */}
            {activeTab === 'stats' && (
              <div className="card-glass rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Head to Head Stats</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {[
                    { label: 'Total Matches', home: '24', away: '18' },
                    { label: 'Wins', home: '14', away: '10' },
                    { label: 'Avg Score', home: '172', away: '165' },
                  ].map(stat => (
                    <div key={stat.label} className="card-glass rounded-lg p-3">
                      <div className="text-xs text-[hsl(var(--muted-foreground))] mb-2">{stat.label}</div>
                      <div className="flex justify-between">
                        <span className="text-sm font-bold text-[hsl(213,90%,65%)]">{stat.home}</span>
                        <span className="text-sm font-bold text-[hsl(340,85%,65%)]">{stat.away}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
                        <span>{match.homeTeam.split(' ').pop()}</span>
                        <span>{match.awayTeam.split(' ').pop()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bet slip sidebar */}
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

      {/* Mobile bet slip */}
      {betSlip.length > 0 && (
        <div className="lg:hidden fixed bottom-[72px] left-4 right-4 z-40">
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
