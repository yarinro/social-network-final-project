const express = require('express');
const {
  createGroup,
  getGroups,
  searchGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  joinGroup,
  approveMember
} = require('../controllers/groupController');
const { getGroupPosts } = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createGroup);
router.get('/search', protect, searchGroups);
router.get('/', getGroups);
router.post('/:id/join', protect, joinGroup);
router.post('/:id/approve/:userId', protect, approveMember);
router.get('/:id/posts', protect, getGroupPosts);
router.patch('/:id', protect, updateGroup);
router.delete('/:id', protect, deleteGroup);
router.get('/:id', protect, getGroupById);

module.exports = router;
