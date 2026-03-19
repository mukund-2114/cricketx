const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/system-data', adminController.getSystemData);
router.post('/ban-user', adminController.handleBanUser);
router.post('/balance-adjust', adminController.handleBalanceAdjust);
router.post('/withdrawal', adminController.handleWithdrawal);

module.exports = router;
