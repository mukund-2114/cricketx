const BetModel = require('../models/Bet');
const supabase = require('../config/supabase');

const placeBet = async (req, res) => {
  const { userId, betData } = req.body;
  if (!userId || !betData) {
    return res.status(400).json({ error: 'Missing bet details' });
  }

  try {
    // 1. Fetch user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('points_balance')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const currentBalance = Number(profile.points_balance);
    const totalStake = betData.stake;

    if (totalStake > currentBalance) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const newBalance = currentBalance - totalStake;

    const insertedBet = await BetModel.placeBetTransaction(userId, betData, newBalance);

    res.status(201).json({ success: true, bet: insertedBet, newBalance });
  } catch (err) {
    console.error('[BetController] Place bet failed:', err.message);
    res.status(500).json({ error: 'Failed' });
  }
};

const getBetsByUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const bets = await BetModel.getUserBets(userId);
    res.json({ bets });
  } catch (err) {
    res.status(500).json({ error: 'Failed' });
  }
};

module.exports = {
  placeBet,
  getBetsByUser
};
