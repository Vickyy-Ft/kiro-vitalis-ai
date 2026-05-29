const express = require('express');
const { checkIn, getHistory, updateLog } = require('../controllers/wellnessController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/checkin', checkIn);
router.get('/history', getHistory);
router.put('/update', updateLog);

module.exports = router;
