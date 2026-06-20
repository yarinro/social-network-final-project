const express = require('express');
const {
  createGroup,
  getGroups,
  getMyGroups,
  searchGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  joinGroup,
  approveMember
} = require('../controllers/groupController');
const { getGroupPosts } = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');

const router = express.Router();

router.post('/', protect, createGroup);
router.get('/search', protect, searchGroups);
router.get('/my', protect, getMyGroups);
router.get('/', getGroups);
router.post('/:id/join', protect, validateObjectId('id'), joinGroup);
router.post(
  '/:id/approve/:userId',
  protect,
  validateObjectId('id', 'userId'),
  approveMember
);
router.get('/:id/posts', protect, validateObjectId('id'), getGroupPosts);
router.patch('/:id', protect, validateObjectId('id'), updateGroup);
router.delete('/:id', protect, validateObjectId('id'), deleteGroup);
router.get('/:id', protect, validateObjectId('id'), getGroupById);

module.exports = router;
