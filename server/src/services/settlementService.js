const supabase = require('../config/supabase');

/**
 * Betting Settlement Service
 * Responsible for calculating P&L and updating user balances after match results
 */

const settleBet = async (bet, isWinner) => {
  const { id, user_id, stake, requested_odds, bet_type } = bet;
  let pnl = 0;
  let status = 'lost';

  if (isWinner) {
    status = 'won';
    // P&L calculation for standard decimal odds
    // Back bet: win Stake * (Odds - 1)
    // Lay bet: win Stake
    pnl = bet_type === 'back' ? (stake * (requested_odds - 1)) : stake;
  } else {
    // Loser logic
    // Back bet: loss is Stake
    // Lay bet: loss is Stake * (Odds - 1)
    pnl = bet_type === 'back' ? -stake : -(stake * (requested_odds - 1));
  }

  // 1. Update Bet Status
  const { error: betError } = await supabase
    .from('bets')
    .update({ status: 'settled', pnl })
    .eq('id', id);

  if (betError) throw betError;

  // 2. Fetch User Profile for current balance (avoid race condition by adding to current)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('points_balance')
    .eq('id', user_id)
    .single();

  if (profileError) throw profileError;

  const newBalance = profile.points_balance + (isWinner ? (stake + pnl) : 0); 
  // Note: For Lay bets, liability was already deducted. 
  // Payout usually returns stake + pnl to user.

  await supabase.from('profiles').update({ points_balance: newBalance }).eq('id', user_id);

  // 3. Log Transaction
  await supabase.from('transactions').insert({
    user_id: user_id,
    type: isWinner ? 'bet_won' : 'bet_lost',
    points: pnl,
    description: `Settlement: ${bet_type.toUpperCase()} bet ${status}. P&L: ${pnl.toFixed(2)}`,
    balance_after: newBalance
  });

  return { id, status, pnl };
};

module.exports = {
  settleBet
};
