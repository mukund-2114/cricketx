const express = require('express');
const matchController = require('../controllers/matchController');

const router = express.Router();

router.get('/', matchController.listMatches);
router.get('/:id', matchController.matchDetails);
router.post('/sync/force', async (req, res) => {
  try {
    const result = await matchController.syncMatches();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Sync failed' });
  }
});

module.exports = router;
