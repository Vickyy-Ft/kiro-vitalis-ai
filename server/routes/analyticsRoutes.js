const express = require('express');
const {
  getMoodAnalytics,
  getSleepAnalytics,
  getHydrationAnalytics,
  getWellnessScoreAnalytics,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/mood', getMoodAnalytics);
router.get('/sleep', getSleepAnalytics);
router.get('/hydration', getHydrationAnalytics);
router.get('/wellness-score', getWellnessScoreAnalytics);

module.exports = router;
