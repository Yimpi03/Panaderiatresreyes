const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');

router.get('/general', statsController.getGeneralStats);
router.get('/daily', statsController.getDailyStats);
router.get('/types', statsController.getTypeStats);
router.get('/users', statsController.getUserStats);
router.get('/export', statsController.getGalleryJSON);

module.exports = router;