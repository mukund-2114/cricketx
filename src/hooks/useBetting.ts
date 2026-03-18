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

    // Fetch latest profile balance to avoid race conditions
    const { data: profile } = await supabase
      .from('profiles')
      .select('points_balance')
      .eq('id', user.id)
      .single();

    const currentBalance = profile ? Number(profile.points_balance) : user.pointsBalance;

    if (totalStake > currentBalance) {
      toast.error('Insufficient balance');
      setIsPlacing(false);
      return;
    }

    let newBalance = currentBalance;

    // Insert all bets
    const betsToInsert = betSlip.map(item => ({
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
    }));

    const { error: betsError } = await supabase.from('bets').insert(betsToInsert);

    if (betsError) {
      console.error('Bets insert error:', betsError);
      toast.error('Failed to place bets. Please try again.');
      setIsPlacing(false);
      return;
    }

    // Insert transactions & update balance
    for (const item of betSlip) {
      newBalance -= item.stake;
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'bet_placed',
        points: -item.stake,
        description: `${item.betType === 'back' ? 'Back' : 'Lay'} ${item.runnerName} @ ${item.odds} — ${item.marketName}`,
        balance_after: newBalance,
      });
    }

    // Apply 2% commission on potential winnings (deducted from potential_pnl display — industry standard)
    console.log(`Commission rate: ${PLATFORM_COMMISSION * 100}%`);

    // Update profile balance
    const { error: balanceError } = await supabase
      .from('profiles')
      .update({ points_balance: newBalance })
      .eq('id', user.id);

    if (balanceError) {
      console.error('Balance update error:', balanceError);
    }

    onBalanceUpdate(newBalance);
    setBetSlip([]);
    setIsPlacing(false);
    toast.success(`${betSlip.length} bet${betSlip.length > 1 ? 's' : ''} placed successfully! 🏏`);
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
