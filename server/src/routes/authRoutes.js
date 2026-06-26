const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Register and login are public; /me needs a valid token
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;
