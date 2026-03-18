import { useState } from 'react';
import { X, Trash2, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import type { BetSlipItem, User } from '@/types';
import { formatPoints, calcPotentialWin, calcLayLiability } from '@/lib/utils';
import { MIN_BET_POINTS } from '@/constants';
import { cn } from '@/lib/utils';

interface BetSlipProps {
  items: BetSlipItem[];
  user: User | null;
  isPlacing: boolean;
  onRemove: (marketId: string, runnerId: string, betType: string) => void;
  onStakeChange: (marketId: string, runnerId: string, betType: string, stake: number) => void;
  onPlaceBets: () => void;
  onClear: () => void;
  onAuthRequired: () => void;
}

const QUICK_STAKES = [500, 1000, 2000, 5000, 10000];

export default function BetSlip({
  items, user, isPlacing, onRemove, onStakeChange, onPlaceBets, onClear, onAuthRequired
}: BetSlipProps) {
  const [collapsed, setCollapsed] = useState(false);

  const totalStake = items.reduce((s, b) => s + (b.stake || 0), 0);
  const totalPnl = items.reduce((s, b) => {
    if (!b.stake) return s;
    return s + (b.betType === 'back'
      ? calcPotentialWin(b.stake, b.odds, 'back')
      : calcLayLiability(b.stake, b.odds));
  }, 0);

  return (
    <div className={cn(
      'w-full card-glass rounded-xl overflow-hidden transition-all',
      collapsed && 'rounded-xl'
    )}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer bg-[hsl(222,35%,12%)] border-b border-[hsl(222,30%,18%)]"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <Zap size={15} className="text-[hsl(var(--brand-gold))]" />
          <span className="text-sm font-bold text-white">Bet Slip</span>
          {items.length > 0 && (
            <span className="bg-[hsl(var(--brand-gold))] text-[hsl(var(--brand-navy))] text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {items.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {items.length > 0 && !collapsed && (
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] flex items-center gap-1 transition-colors"
            >
              <Trash2 size={12} /> Clear All
            </button>
          )}
          {collapsed ? <ChevronDown size={16} className="text-[hsl(var(--muted-foreground))]" /> : <ChevronUp size={16} className="text-[hsl(var(--muted-foreground))]" />}
        </div>
      </div>

      {!collapsed && (
        <>
          {items.length === 0 ? (
            <div className="py-8 px-4 text-center">
              <div className="text-3xl mb-2">🏏</div>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">Click any odds to add to slip</p>
            </div>
          ) : (
            <div className="divide-y divide-[hsl(222,30%,15%)]">
              {items.map((item) => {
                const pnl = item.stake ? (item.betType === 'back'
                  ? calcPotentialWin(item.stake, item.odds, 'back')
                  : calcLayLiability(item.stake, item.odds)) : 0;
                return (
                  <div key={`${item.marketId}-${item.runnerId}-${item.betType}`}
                    className={cn('p-3', item.betType === 'back' ? 'bet-slip-row' : 'bet-slip-row-lay')}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          'inline-block text-xs font-bold px-1.5 py-0.5 rounded mb-1',
                          item.betType === 'back'
                            ? 'bg-[hsl(213,90%,20%)] text-[hsl(213,90%,70%)]'
                            : 'bg-[hsl(340,85%,20%)] text-[hsl(340,85%,70%)]'
                        )}>
                          {item.betType.toUpperCase()}
                        </div>
                        <p className="text-xs font-semibold text-white leading-tight truncate">{item.runnerName}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{item.matchName}</p>
                      </div>
                      <div className="text-right ml-2">
                        <div className={cn(
                          'text-sm font-bold',
                          item.betType === 'back' ? 'text-[hsl(213,90%,65%)]' : 'text-[hsl(340,85%,65%)]'
                        )}>
                          {item.odds.toFixed(2)}
                        </div>
                        <button onClick={() => onRemove(item.marketId, item.runnerId, item.betType)}
                          className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] transition-colors mt-1">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    {/* Stake input */}
                    <div className="mb-2">
                      <div className="flex items-center bg-[hsl(222,35%,14%)] border border-[hsl(222,30%,22%)] rounded-lg overflow-hidden">
                        <span className="px-2 text-xs text-[hsl(var(--muted-foreground))] whitespace-nowrap">Stake (pts)</span>
                        <input
                          type="number"
                          min={MIN_BET_POINTS}
                          value={item.stake || ''}
                          onChange={e => onStakeChange(item.marketId, item.runnerId, item.betType, Number(e.target.value))}
                          placeholder="0"
                          className="flex-1 bg-transparent px-2 py-2 text-sm text-white text-right focus:outline-none w-0 min-w-0"
                        />
                      </div>
                    </div>
                    {/* Quick stakes */}
                    <div className="flex gap-1 mb-2">
                      {QUICK_STAKES.map(s => (
                        <button key={s} onClick={() => onStakeChange(item.marketId, item.runnerId, item.betType, s)}
                          className="flex-1 text-xs py-1 rounded bg-[hsl(222,35%,16%)] hover:bg-[hsl(222,35%,20%)] text-[hsl(var(--muted-foreground))] hover:text-white transition-colors">
                          {s >= 1000 ? `${s / 1000}K` : s}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-[hsl(var(--muted-foreground))]">
                        {item.betType === 'back' ? 'Potential Win' : 'Liability'}:
                      </span>
                      <span className={cn(
                        'font-semibold',
                        item.betType === 'back' ? 'text-[hsl(var(--brand-win))]' : 'text-[hsl(var(--destructive))]'
                      )}>
                        {item.stake ? formatPoints(pnl) : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          {items.length > 0 && (
            <div className="px-3 py-3 bg-[hsl(222,35%,12%)] border-t border-[hsl(222,30%,18%)]">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-[hsl(var(--muted-foreground))]">Total Stake:</span>
                <span className="text-white font-semibold">{formatPoints(totalStake)}</span>
              </div>
              <div className="flex justify-between text-xs mb-3">
                <span className="text-[hsl(var(--muted-foreground))]">Total Potential Win:</span>
                <span className="text-[hsl(var(--brand-win))] font-semibold">{formatPoints(totalPnl)}</span>
              </div>
              {user && (
                <div className="text-xs text-[hsl(var(--muted-foreground))] mb-3 text-right">
                  Balance: {formatPoints(user.pointsBalance)}
                </div>
              )}
              <button
                onClick={user ? onPlaceBets : onAuthRequired}
                disabled={isPlacing}
                className="w-full gold-gradient text-[hsl(var(--brand-navy))] font-bold py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 text-sm"
              >
                {isPlacing ? 'Placing...' : user ? `Place ${items.length} Bet${items.length > 1 ? 's' : ''}` : 'Login to Bet'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
