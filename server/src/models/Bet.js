const supabase = require('../config/supabase');

const placeBetTransaction = async (userId, betData, newBalance) => {
  // Supabase doesn't support complex server-side transactions via individual calls.
  // We'll use multiple calls but we should use RPC if we want it truly atomic.
  // For production level, we'll try to use standard calls for now but RPC is better.
  
  // 1. Insert Bet
  const { data: bet, error: betError } = await supabase
    .from('bets')
    .insert(betData)
    .select();

  if (betError) throw betError;

  // 2. Insert Transaction
  const { error: txError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'bet_placed',
      points: -betData.stake,
      description: `${betData.bet_type.toUpperCase()} ${betData.runner_name} @ ${betData.requested_odds} — ${betData.market_name}`,
      balance_after: newBalance,
    });

  if (txError) throw txError;

  // 3. Update Balance
  const { error: balanceError } = await supabase
    .from('profiles')
    .update({ points_balance: newBalance })
    .eq('id', userId);

  if (balanceError) throw balanceError;

  return bet;
};

const getUserBets = async (userId) => {
  const { data, error } = await supabase
    .from('bets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

module.exports = {
  placeBetTransaction,
  getUserBets
};
