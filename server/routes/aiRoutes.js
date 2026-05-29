const express = require('express');
const { chat, getChatHistory } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/chat', chat);
router.get('/history', getChatHistory);

module.exports = router;
