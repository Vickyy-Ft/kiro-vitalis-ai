const express = require('express');
const { getDashboard, updateProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect); // all user routes are protected

router.get('/dashboard', getDashboard);
router.put('/update-profile', updateProfile);

module.exports = router;
