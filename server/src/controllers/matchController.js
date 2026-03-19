const oddsService = require('../services/oddsService');
const MatchModel = require('../models/Match');

const syncMatches = async () => {
  try {
    console.log('[MatchController] Starting full sync...');
    const { fixtures, groups } = await oddsService.fetchAllFixtures();
    
    if (fixtures && fixtures.length > 0) {
      // Clean up for DB upsert (only known columns)
      const dbFixtures = fixtures.map(({ id, series, home_team, away_team, venue, start_time, status, sport }) => ({
        id, series, home_team, away_team, venue, start_time, status, sport
      }));

      await MatchModel.upsertMatches(fixtures, dbFixtures);
      console.log(`[MatchController] Synced ${fixtures.length} matches across ${groups.length} sports.`);
    }
    return { success: true, count: fixtures.length };
  } catch (err) {
    console.error('[MatchController] Sync process failed:', err.message);
    throw err;
  }
};

const listMatches = async (req, res) => {
  try {
    const { sport } = req.query;
    const matches = await MatchModel.getMatches({ sport });
    
    // Group analysis for frontend sidebar
    const groups = Array.from(new Set(matches.map(m => m.sport_group)));
    
    res.json({ matches, groups });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
};

const matchDetails = async (req, res) => {
  try {
    const matchId = req.params.id;
    const match = await MatchModel.getMatchById(matchId);
    
    if (!match) {
      return res.status(404).json({ error: 'Fixture not found' });
    }

    let marketsMapped = [];
    try {
      console.log(`[DeepScan] Fetching Detailed Odds for ${matchId} (Region: ${match.region})...`);
      marketsMapped = await oddsService.fetchOddsForMatch(match.sport_key, matchId, match.region, match.home_team, match.away_team);
      
      // CACHE SUCCESS: Store this 'previous data' in case next fetch fails
      if (marketsMapped && marketsMapped.length > 0) {
        MatchModel.saveMarketsToMemory(matchId, marketsMapped);
      }
    } catch (oddsErr) {
      console.warn(`[MatchController] Odds fetch failed for ${matchId}, checking 'previous data' cache...`, oddsErr.message);
      marketsMapped = MatchModel.getMarketsFromMemory(matchId);
    }
    
    res.json({ ...match, markets: marketsMapped || [] });
  } catch (err) {
    console.error('[MatchController] Match details lookup failed:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  syncMatches,
  listMatches,
  matchDetails
};
