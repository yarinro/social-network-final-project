const express = require('express');
const {
  createMessage,
  getConversation,
  getMessages,
  markAsRead
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');

const router = express.Router();

// REST endpoints for stored messages (chat also uses Socket.IO)
router.post('/', protect, createMessage);
router.get(
  '/conversation/:userId',
  protect,
  validateObjectId('userId'),
  getConversation
);
router.get('/', protect, getMessages);
router.patch('/:id/read', protect, validateObjectId('id'), markAsRead);

module.exports = router;
