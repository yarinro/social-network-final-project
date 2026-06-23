const express = require('express');
const {
  getUsers,
  getMyProfile,
  updateMyProfile,
  deleteMyAccount,
  getPublicProfile,
  getUserById,
  searchUsers,
  addFriend,
  removeFriend
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');

const router = express.Router();

router.get('/me', protect, getMyProfile);
router.patch('/me', protect, updateMyProfile);
router.delete('/me', protect, deleteMyAccount);
router.get('/search', protect, searchUsers);
router.get('/', protect, getUsers);
router.get('/:id/public', protect, validateObjectId('id'), getPublicProfile);
router.get('/:id', protect, validateObjectId('id'), getUserById);
router.post('/:id/friend', protect, validateObjectId('id'), addFriend);
router.delete('/:id/friend', protect, validateObjectId('id'), removeFriend);

module.exports = router;
