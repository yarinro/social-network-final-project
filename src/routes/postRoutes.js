const express = require('express');
const {
  createPost,
  getPosts,
  getFeed,
  getMyPosts,
  getPostsByGroup,
  getPostById,
  updatePost,
  deletePost
} = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');

const router = express.Router();

router.post('/', protect, createPost);
router.get('/feed', protect, getFeed);
router.get('/my', protect, getMyPosts);
router.get('/group/:groupId', protect, validateObjectId('groupId'), getPostsByGroup);
router.get('/:id', validateObjectId('id'), getPostById);
router.patch('/:id', protect, validateObjectId('id'), updatePost);
router.delete('/:id', protect, validateObjectId('id'), deletePost);
router.get('/', getPosts);

module.exports = router;
