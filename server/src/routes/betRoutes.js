const express = require('express');
const betController = require('../controllers/betController');

const router = express.Router();

router.post('/place', betController.placeBet);
router.get('/user/:userId', betController.getBetsByUser);

module.exports = router;
