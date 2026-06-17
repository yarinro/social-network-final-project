const express = require('express');
const {
  createMessage,
  getConversation,
  getMessages,
  markAsRead
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createMessage);
router.get('/conversation/:userId', protect, getConversation);
router.get('/', protect, getMessages);
router.patch('/:id/read', protect, markAsRead);

module.exports = router;
