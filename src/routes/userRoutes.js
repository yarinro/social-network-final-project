const express = require('express');
const {
  getUsers,
  getMyProfile,
  updateMyProfile,
  deleteMyAccount,
  getUserById,
  searchUsers,
  addFriend,
  removeFriend
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/me', protect, getMyProfile);
router.patch('/me', protect, updateMyProfile);
router.delete('/me', protect, deleteMyAccount);
router.get('/search', protect, searchUsers);
router.get('/', protect, getUsers);
router.get('/:id', protect, getUserById);
router.post('/:id/friend', protect, addFriend);
router.delete('/:id/friend', protect, removeFriend);

module.exports = router;
