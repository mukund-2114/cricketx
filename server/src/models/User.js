const supabase = require('../config/supabase');

const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
};

const updateProfileBalance = async (userId, newBalance) => {
  const { data, error } = await supabase
    .from('profiles')
    .update({ points_balance: newBalance })
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

module.exports = {
  getProfile,
  updateProfileBalance
};
