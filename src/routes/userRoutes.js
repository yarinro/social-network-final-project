const express = require('express');
const {
  getUsers,
  getUserById,
  searchUsers,
  addFriend,
  removeFriend
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getUsers);
router.get('/search/:query', protect, searchUsers);
router.get('/:id', protect, getUserById);
router.post('/:id/friend', protect, addFriend);
router.delete('/:id/friend', protect, removeFriend);

module.exports = router;
