const app = require('./app');
const cron = require('node-cron');
const matchController = require('./controllers/matchController');
require('dotenv').config();

const PORT = process.env.PORT || 3001;

// ── SYNC ENGINE: Cron Jobs ──────────────────────────
// Sync matches every 20 minutes
cron.schedule('*/20 * * * *', async () => {
  console.log('[Cron] Initiating match sync...');
  try {
    await matchController.syncMatches();
  } catch (err) {
    console.error('[Cron] Match sync failed:', err.message);
  }
});

// Run an initial sync on start
(async () => {
  console.log('[Server] Performing initial match sync...');
  try {
    await matchController.syncMatches();
  } catch (err) {
    console.warn('[Server] Initial sync failed, using existing DB data or will retry next cron.');
  }
})();

app.listen(PORT, () => {
  console.log(`[Server] Production-level betting backend active on ${PORT}`);
});
