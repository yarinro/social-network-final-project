const express = require('express');
const {
  getMessages,
  getMessageById,
  createMessage
} = require('../controllers/messageController');

const router = express.Router();

router.get('/', getMessages);
router.get('/:id', getMessageById);
router.post('/', createMessage);

module.exports = router;
