const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create an admin Supabase client using the Service Role Key
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const getSystemData = async (req, res) => {
  try {
    const [usersRes, betsRes, withdrawalsRes] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').neq('role', 'admin').order('created_at', { ascending: false }),
      supabaseAdmin.from('bets').select('*').order('placed_at', { ascending: false }).limit(100),
      supabaseAdmin.from('withdrawals').select('*').order('requested_at', { ascending: false }),
    ]);

    res.json({
      users: usersRes.data || [],
      bets: betsRes.data || [],
      withdrawals: withdrawalsRes.data || []
    });
  } catch (err) {
    console.error('[AdminController] Dashboard Error:', err);
    res.status(500).json({ error: 'Failed to fetch admin data' });
  }
};

const handleBanUser = async (req, res) => {
  try {
    const { userId, makeActive } = req.body;
    const { error } = await supabaseAdmin.from('profiles').update({ is_active: makeActive }).eq('id', userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const handleBalanceAdjust = async (req, res) => {
  try {
    const { userId, amount, note, currentBalance } = req.body;
    const newBalance = Math.max(0, currentBalance + amount);
    
    const { error } = await supabaseAdmin.from('profiles').update({ points_balance: newBalance }).eq('id', userId);
    if (error) throw error;

    await supabaseAdmin.from('transactions').insert({
      user_id: userId,
      type: 'admin_adjustment',
      points: amount,
      description: note || `Admin balance adjustment: ${amount > 0 ? '+' : ''}${amount}`,
      balance_after: newBalance,
    });

    res.json({ success: true, newBalance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const handleWithdrawal = async (req, res) => {
  try {
    const { id, approve } = req.body;
    const newStatus = approve ? 'approved' : 'rejected';

    const { error } = await supabaseAdmin
      .from('withdrawals')
      .update({ status: newStatus, processed_at: new Date().toISOString() })
      .eq('id', id);
    
    if (error) throw error;
    res.json({ success: true, status: newStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getSystemData,
  handleBanUser,
  handleBalanceAdjust,
  handleWithdrawal
};
