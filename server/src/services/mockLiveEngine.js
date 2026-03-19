const MatchModel = require('../models/Match');

/**
 * Mock Live Engine
 * Simulates real-time ball-by-ball score updates for live matches in memory.
 * This demonstrates how the frontend handles rapid score changes and how
 * betting markets (especially Fancy markets) would settle.
 */

const startMockLiveEngine = () => {
  console.log('[MockLiveEngine] 🏏 Starting live score simulation...');
  
  // Update scores every 5 seconds to simulate a live match
  setInterval(async () => {
    const matches = await MatchModel.getMatches({});
    const liveMatches = matches.filter(m => m.status === 'live');

    liveMatches.forEach(match => {
      // 1. Initialize score if it doesn't exist
      if (!match.score) {
        match.score = {
          homeRuns: 0,
          homeWickets: 0,
          homeOvers: "0.0",
          awayRuns: 0,
          awayWickets: 0,
          awayOvers: "0.0",
          currRunRate: "0.0",
          lastBallResult: "-",
          currentBatsman1: "Batsman A",
          currentBowler: "Bowler X"
        };
      }

      // 2. Simulate a single ball
      const runs = [0, 1, 2, 3, 4, 6, 'W'][Math.floor(Math.random() * 7)];
      const currentOvers = parseFloat(match.score.homeOvers);
      const balls = Math.round((currentOvers % 1) * 10);
      let newOvers;

      if (balls >= 5) {
        newOvers = (Math.floor(currentOvers) + 1).toFixed(1);
      } else {
        newOvers = (currentOvers + 0.1).toFixed(1);
      }

      // 3. Update scores
      if (runs === 'W') {
        match.score.homeWickets = Math.min(10, match.score.homeWickets + 1);
        match.score.lastBallResult = 'Wicket!';
      } else {
        match.score.homeRuns += runs;
        match.score.lastBallResult = runs === 0 ? 'Dot Ball' : `${runs} Runs`;
      }

      match.score.homeOvers = newOvers;
      match.score.currRunRate = (match.score.homeRuns / (parseFloat(newOvers) || 1)).toFixed(2);

      // 4. Update memory store directly (MatchModel uses MEMORY_MATCHES)
      // Since it's a reference, it's already updated in MatchModel's memory.
    });
  }, 5000);
};

module.exports = {
  startMockLiveEngine
};
