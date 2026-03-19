const axios = require('axios');
require('dotenv').config();

const BASE_URL = "https://api.the-odds-api.com/v4";
const API_KEY = process.env.ODDS_API_KEY;

if (!API_KEY) {
  throw new Error('Missing Odds API key');
}

const MARKET_CONFIG = [
  { key: 'cricket_ipl', group: 'Cricket', region: 'uk' },
  { key: 'cricket_international_t20', group: 'Cricket', region: 'uk' },
  { key: 'basketball_nba', group: 'Basketball', region: 'us' },
  { key: 'soccer_epl', group: 'Soccer', region: 'uk' },
  { key: 'soccer_uefa_champs_league', group: 'Soccer', region: 'uk' },
  { key: 'baseball_mlb', group: 'Baseball', region: 'us' },
  { key: 'americanfootball_nfl', group: 'NFL', region: 'us' },
  { key: 'icehockey_nhl', group: 'Hockey', region: 'us' },
  { key: 'mma_mixed_martial_arts', group: 'MMA', region: 'us' }
];

function sportTitleMapping(key) {
  if (key === 'cricket_ipl') return 'IPL 2026';
  if (key === 'soccer_epl') return 'Premier League';
  if (key === 'basketball_nba') return 'NBA';
  if (key === 'americanfootball_nfl') return 'NFL';
  if (key === 'baseball_mlb') return 'MLB';
  return 'International Series';
}

const fetchAllFixtures = async () => {
  let discovered = [];
  const groupsFound = new Set();

  for (const config of MARKET_CONFIG) {
    try {
      console.log(`[OddsService] Scanning ${config.key}...`);
      const res = await axios.get(`${BASE_URL}/sports/${config.key}/events?apiKey=${API_KEY}`);
      
      if (res.data?.length > 0) {
        const fixtures = res.data.map(m => {
          groupsFound.add(config.group);
          return {
            id: m.id,
            sport_key: config.key,
            sport_group: config.group,
            series: sportTitleMapping(config.key),
            home_team: m.home_team,
            away_team: m.away_team,
            venue: 'Professional Arena',
            start_time: m.commence_time,
            status: new Date(m.commence_time) <= new Date() ? 'live' : 'upcoming',
            sport: config.group.toLowerCase(),
            region: config.region,
          };
        });
        discovered = [...discovered, ...fixtures];
      }
      // Small delay between calls
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`[OddsService] Skip ${config.key}: ${err.message}`);
    }
  }

  return { fixtures: discovered, groups: Array.from(groupsFound) };
};

const fetchOddsForMatch = async (sportKey, matchId, region, homeTeam = 'Home Team', awayTeam = 'Away Team') => {
  try {
    const url = `${BASE_URL}/sports/${sportKey}/events/${matchId}/odds?apiKey=${API_KEY}&regions=${region}&markets=h2h,spreads,totals&oddsFormat=decimal`;
    const res = await axios.get(url);
    const data = res.data;

    if (data && data.bookmakers?.[0]) {
      const marketsMapped = data.bookmakers[0].markets.map(mkt => ({
        id: `mkt_${matchId}_${mkt.key}`,
        name: mkt.key === 'h2h' ? 'Match Odds' : (mkt.key === 'totals' ? 'Total Points' : mkt.key),
        type: mkt.key,
        status: 'open',
        runners: mkt.outcomes.map((o, i) => ({
          id: `run_${matchId}_${mkt.key}_${i}`,
          name: o.name + (o.point ? ` (${o.point})` : ''),
          lastTradedPrice: o.price,
          backOdds: [{ price: o.price, size: 50000 }],
          layOdds: [{ price: Number((o.price + 0.02).toFixed(2)), size: 30000 }]
        }))
      }));
      return marketsMapped;
    }
    return [];
  } catch (err) {
    console.warn(`[OddsService] ${matchId} Detail Error (Quota likely reached), generating fallback odds:`, err.response?.status || err.message);
    
    // Generate fallback odds so the app still works for the user
    return [
      {
        id: `mkt_${matchId}_fallback_h2h`,
        name: 'Match Odds',
        type: 'match_odds',
        status: 'open',
        runners: [
          {
            id: `run_${matchId}_fallback_1`,
            name: homeTeam,
            lastTradedPrice: 1.95,
            backOdds: [{ price: 1.95, size: 50000 }, { price: 1.93, size: 25000 }],
            layOdds: [{ price: 1.97, size: 30000 }, { price: 1.99, size: 10000 }]
          },
          {
            id: `run_${matchId}_fallback_2`,
            name: awayTeam,
            lastTradedPrice: 2.05,
            backOdds: [{ price: 2.05, size: 45000 }, { price: 2.02, size: 20000 }],
            layOdds: [{ price: 2.07, size: 28000 }, { price: 2.09, size: 8000 }]
          }
        ]
      }
    ];
  }
};

module.exports = {
  fetchAllFixtures,
  fetchOddsForMatch
};
