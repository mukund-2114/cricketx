import { Zap } from 'lucide-react';
import type { Match } from '@/types';

interface LiveScoreBarProps {
  matches: Match[];
}

export default function LiveScoreBar({ matches }: LiveScoreBarProps) {
  const liveMatches = matches.filter(m => m.status === 'live');
  if (liveMatches.length === 0) return null;

  return (
    <div className="w-full bg-[hsl(222,40%,9%)] border-b border-[hsl(222,30%,15%)] overflow-x-auto scrollbar-hide">
      <div className="flex items-center gap-0 min-w-max">
        <div className="flex items-center gap-1.5 px-3 py-2 bg-[hsl(142,50%,10%)] border-r border-[hsl(222,30%,15%)] flex-shrink-0">
          <span className="live-dot"></span>
          <span className="text-xs font-bold text-[hsl(142,76%,55%)]">LIVE</span>
        </div>
        {liveMatches.map(match => (
          <div key={match.id} className="flex items-center gap-3 px-4 py-2 border-r border-[hsl(222,30%,15%)] flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">{match.homeTeam.split(' ').map(w => w[0]).join('')}</span>
              {match.score && (
                <>
                  <span className="text-xs font-bold text-[hsl(var(--brand-gold))]">
                    {match.score.homeRuns}/{match.score.homeWickets} ({match.score.homeOvers})
                  </span>
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">vs</span>
                  <span className="text-xs font-semibold text-white">{match.awayTeam.split(' ').map(w => w[0]).join('')}</span>
                  <div className="flex items-center gap-1 ml-1">
                    <Zap size={10} className="text-[hsl(var(--brand-gold))]" />
                    <span className="text-xs text-[hsl(var(--brand-gold))]">{match.score.lastBallResult}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
