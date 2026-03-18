import { Clock, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Match, BetSlipItem } from '@/types';
import { useLiveOdds } from '@/hooks/useLiveOdds';
import { timeUntil, formatPoints } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface MatchCardProps {
  match: Match;
  onAddToBetSlip: (item: BetSlipItem) => void;
}

export default function MatchCard({ match, onAddToBetSlip }: MatchCardProps) {
  const navigate = useNavigate();
  const liveMarkets = useLiveOdds(match.markets);
  const matchOddsMarket = liveMarkets.find(m => m.type === 'match_odds');

  const handleOddsClick = (
    e: React.MouseEvent,
    runnerId: string,
    runnerName: string,
    marketId: string,
    odds: number,
    betType: 'back' | 'lay'
  ) => {
    e.stopPropagation();
    if (!matchOddsMarket) return;
    onAddToBetSlip({
      marketId,
      matchId: match.id,
      matchName: `${match.homeTeam} vs ${match.awayTeam}`,
      marketName: 'Match Odds',
      runnerId,
      runnerName,
      betType,
      odds,
      stake: 0,
    });
  };

  return (
    <div
      className="card-glass rounded-xl overflow-hidden hover:border-[hsl(222,30%,28%)] transition-all cursor-pointer group"
      onClick={() => navigate(`/match/${match.id}`)}
    >
      {/* Match header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[hsl(222,40%,9%)] border-b border-[hsl(222,30%,15%)]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[hsl(var(--muted-foreground))]">{match.series}</span>
          <span className="text-xs text-[hsl(var(--muted-foreground))]">•</span>
          <span className="text-xs text-[hsl(var(--muted-foreground))] truncate max-w-[160px]">{match.venue}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {match.status === 'live' ? (
            <div className="flex items-center gap-1 bg-[hsl(142,40%,10%)] border border-[hsl(142,40%,20%)] rounded px-2 py-0.5">
              <span className="live-dot"></span>
              <span className="text-xs font-bold text-[hsl(142,76%,55%)]">LIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
              <Clock size={11} />
              {timeUntil(match.startTime)}
            </div>
          )}
        </div>
      </div>

      {/* Teams + Score */}
      <div className="px-4 py-3">
        {/* Live score */}
        {match.status === 'live' && match.score && (
          <div className="mb-3 bg-[hsl(222,35%,12%)] rounded-lg px-3 py-2">
            <div className="flex items-center justify-between mb-1">
              <div>
                <span className="text-sm font-bold text-white">{match.homeTeam.split(' ').pop()}</span>
                <span className="ml-2 text-base font-bold text-[hsl(var(--brand-gold))]">
                  {match.score.homeRuns}/{match.score.homeWickets}
                </span>
                <span className="text-xs text-[hsl(var(--muted-foreground))] ml-1">({match.score.homeOvers})</span>
              </div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] text-right">
                <div>CRR: {match.score.currRunRate}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
              <Zap size={10} className="text-[hsl(var(--brand-gold))]" />
              {match.score.lastBallResult} • {match.score.currentBatsman1} • {match.score.currentBowler}
            </div>
          </div>
        )}

        {/* Teams row */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-white truncate max-w-[120px]">{match.homeTeam}</div>
          <div className="text-xs font-bold text-[hsl(var(--muted-foreground))] px-3">vs</div>
          <div className="text-sm font-semibold text-white truncate max-w-[120px] text-right">{match.awayTeam}</div>
        </div>

        {/* Odds grid */}
        {matchOddsMarket && (
          <div>
            {/* Column headers */}
            <div className="grid grid-cols-3 gap-1 mb-1">
              <div></div>
              <div className="grid grid-cols-3 gap-0.5">
                {['Best Back', '', ''].map((_, i) => (
                  <div key={i} className={cn(
                    'text-center text-[10px] font-bold rounded-sm py-0.5',
                    i === 0 ? 'bg-[hsl(213,90%,20%)] text-[hsl(213,90%,70%)] col-span-1' : ''
                  )}>
                    {i === 0 ? 'BACK' : ''}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-0.5">
                {['', '', 'Best Lay'].map((_, i) => (
                  <div key={i} className={cn(
                    'text-center text-[10px] font-bold rounded-sm py-0.5',
                    i === 2 ? 'bg-[hsl(340,85%,20%)] text-[hsl(340,85%,70%)] col-span-1' : ''
                  )}>
                    {i === 2 ? 'LAY' : ''}
                  </div>
                ))}
              </div>
            </div>

            {/* Back/Lay headers row */}
            <div className="flex text-center mb-1">
              <div className="flex-1"></div>
              <div className="flex gap-0.5" style={{ width: '192px' }}>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))] text-center" style={{ width: '64px' }}>Back 3</div>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))] text-center" style={{ width: '64px' }}>Back 2</div>
                <div className="text-[10px] font-bold text-[hsl(213,90%,65%)] text-center" style={{ width: '64px' }}>Back 1</div>
                <div className="text-[10px] font-bold text-[hsl(340,85%,65%)] text-center" style={{ width: '64px' }}>Lay 1</div>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))] text-center" style={{ width: '64px' }}>Lay 2</div>
                <div className="text-[10px] text-[hsl(var(--muted-foreground))] text-center" style={{ width: '64px' }}>Lay 3</div>
              </div>
            </div>

            {matchOddsMarket.runners.map((runner) => (
              <div key={runner.id} className="flex items-center gap-1 mb-1.5">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate">{runner.name}</div>
                  <div className="text-[10px] text-[hsl(var(--muted-foreground))]">LTP: {runner.lastTradedPrice.toFixed(2)}</div>
                </div>
                {/* Back odds (3 levels) */}
                <div className="flex gap-0.5">
                  {runner.backOdds.slice(0, 3).reverse().map((o, i) => (
                    <button
                      key={i}
                      onClick={(e) => handleOddsClick(e, runner.id, runner.name, matchOddsMarket.id, o.price, 'back')}
                      className={cn(
                        'odds-cell text-center',
                        i === 2 ? 'back-btn' : 'bg-[hsl(213,90%,15%)] hover:bg-[hsl(213,90%,22%)]'
                      )}
                    >
                      <div className={cn('text-xs font-bold', i === 2 ? 'text-white' : 'text-[hsl(213,90%,65%)]')}>
                        {o.price.toFixed(2)}
                      </div>
                      <div className="text-[9px] text-[hsl(213,90%,75%)] opacity-70">
                        {formatPoints(o.size).replace(' pts', '')}
                      </div>
                    </button>
                  ))}
                  {/* Lay odds (3 levels) */}
                  {runner.layOdds.slice(0, 3).map((o, i) => (
                    <button
                      key={i}
                      onClick={(e) => handleOddsClick(e, runner.id, runner.name, matchOddsMarket.id, o.price, 'lay')}
                      className={cn(
                        'odds-cell text-center',
                        i === 0 ? 'lay-btn' : 'bg-[hsl(340,85%,12%)] hover:bg-[hsl(340,85%,18%)]'
                      )}
                    >
                      <div className={cn('text-xs font-bold', i === 0 ? 'text-white' : 'text-[hsl(340,85%,65%)]')}>
                        {o.price.toFixed(2)}
                      </div>
                      <div className="text-[9px] text-[hsl(340,85%,75%)] opacity-70">
                        {formatPoints(o.size).replace(' pts', '')}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Market count */}
        <div className="mt-2 flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
          <span>{match.markets.length} market{match.markets.length > 1 ? 's' : ''}</span>
          {match.markets.some(m => m.type === 'fancy') && <span className="text-[hsl(var(--brand-gold))]">Fancy</span>}
          <span className="ml-auto text-[hsl(var(--brand-gold))] opacity-0 group-hover:opacity-100 transition-opacity">View All →</span>
        </div>
      </div>
    </div>
  );
}
