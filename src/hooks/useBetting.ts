import { useState, useCallback } from 'react';
import type { BetSlipItem, User } from '@/types';
import { supabase } from '@/lib/supabase';
import { calcPotentialWin } from '@/lib/utils';
import { PLATFORM_COMMISSION } from '@/constants';
import { toast } from 'sonner';

export function useBetting(user: User | null, onBalanceUpdate: (b: number) => void) {
  const [betSlip, setBetSlip] = useState<BetSlipItem[]>([]);
  const [isPlacing, setIsPlacing] = useState(false);

  const addToBetSlip = useCallback((item: BetSlipItem) => {
    setBetSlip(prev => {
      const exists = prev.find(
        b => b.marketId === item.marketId && b.runnerId === item.runnerId && b.betType === item.betType
      );
      if (exists) {
        return prev.map(b =>
          b.marketId === item.marketId && b.runnerId === item.runnerId && b.betType === item.betType
            ? { ...b, odds: item.odds, stake: item.stake }
            : b
        );
      }
      return [...prev, item];
    });
  }, []);

  const removeBetSlipItem = useCallback((marketId: string, runnerId: string, betType: string) => {
    setBetSlip(prev => prev.filter(
      b => !(b.marketId === marketId && b.runnerId === runnerId && b.betType === betType)
    ));
  }, []);

  const updateStake = useCallback((marketId: string, runnerId: string, betType: string, stake: number) => {
    setBetSlip(prev => prev.map(b =>
      b.marketId === marketId && b.runnerId === runnerId && b.betType === betType
        ? { ...b, stake }
        : b
    ));
  }, []);

  const clearBetSlip = useCallback(() => setBetSlip([]), []);

  const placeBets = useCallback(async () => {
    if (!user) { toast.error('Please log in to place bets'); return; }
    if (betSlip.length === 0) { toast.error('Bet slip is empty'); return; }

    const totalStake = betSlip.reduce((s, b) => s + (b.stake || 0), 0);
    if (totalStake > user.pointsBalance) {
      toast.error('Insufficient balance');
      return;
    }

    for (const item of betSlip) {
      if (!item.stake || item.stake <= 0) {
        toast.error(`Enter a stake for ${item.runnerName}`);
        return;
      }
    }

    setIsPlacing(true);

    try {
      for (const item of betSlip) {
        if (!item.stake || item.stake <= 0) {
          toast.error(`Enter a stake for ${item.runnerName}`);
          setIsPlacing(false);
          return;
        }

        const betData = {
          user_id: user.id,
          market_id: item.marketId,
          match_id: item.matchId,
          match_name: item.matchName,
          market_name: item.marketName,
          runner_name: item.runnerName,
          runner_id: item.runnerId,
          bet_type: item.betType,
          requested_odds: item.odds,
          matched_odds: item.odds,
          stake: item.stake,
          potential_pnl: calcPotentialWin(item.stake, item.odds, item.betType),
          status: 'matched',
        };

        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await fetch(`${backendUrl}/api/bets/place`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, betData }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to place bet');
        }

        const result = await response.json();
        onBalanceUpdate(result.newBalance);
      }

      setBetSlip([]);
      toast.success(`${betSlip.length} bet${betSlip.length > 1 ? 's' : ''} placed successfully! 🏏`);
    } catch (err: any) {
      console.error('Bet placement error:', err);
      toast.error(err.message || 'Failed to place bets. Please try again.');
    } finally {
      setIsPlacing(false);
    }
  }, [user, betSlip, onBalanceUpdate]);

  return {
    betSlip,
    addToBetSlip,
    removeBetSlipItem,
    updateStake,
    clearBetSlip,
    placeBets,
    isPlacing,
  };
}
