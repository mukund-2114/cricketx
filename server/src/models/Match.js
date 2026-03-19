const supabase = require('../config/supabase');

let MEMORY_MATCHES = [];
let MEMORY_MARKETS = {}; // { matchId: [markets] }

const saveMarketsToMemory = (matchId, markets) => {
  if (markets && markets.length > 0) {
    MEMORY_MARKETS[matchId] = markets;
  }
};

const getMarketsFromMemory = (matchId) => {
  return MEMORY_MARKETS[matchId] || [];
};

const upsertMatches = async (matches, dbMatches = matches) => {
  // Always update memory with full data for frontend
  MEMORY_MATCHES = matches;

  try {
    const { data, error } = await supabase
      .from('matches')
      .upsert(dbMatches, { onConflict: 'id' });
    
    if (error) {
      console.warn('[Model:Match] DB Upsert warning (likely RLS):', error.message);
    }
    return matches;
  } catch (err) {
    console.warn('[Model:Match] DB Upsert exception:', err.message);
    return matches;
  }
};

const getMatches = async (filters = {}) => {
  try {
    let query = supabase.from('matches').select('*');
    if (filters.sport) {
      query = query.eq('sport', filters.sport.toLowerCase());
    }
    const { data, error } = await query.order('start_time', { ascending: true });
    
    // Always prefer MEMORY_MATCHES since it contains the full object with sport_key and region
    if (MEMORY_MATCHES.length > 0) {
       return MEMORY_MATCHES.filter(m => !filters.sport || m.sport === filters.sport.toLowerCase());
    }
    
    if (error || !data || data.length === 0) {
      return MEMORY_MATCHES.filter(m => !filters.sport || m.sport === filters.sport.toLowerCase());
    }
    return data;
  } catch (err) {
    return MEMORY_MATCHES;
  }
};

const getMatchById = async (id) => {
  try {
    // Prefer memory matches for the full object with API keys
    const memMatch = MEMORY_MATCHES.find(m => m.id === id);
    if (memMatch) return memMatch;

    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) {
      return null;
    }
    return data;
  } catch (err) {
    return MEMORY_MATCHES.find(m => m.id === id);
  }
};

module.exports = {
  upsertMatches,
  getMatches,
  getMatchById,
  saveMarketsToMemory,
  getMarketsFromMemory
};
