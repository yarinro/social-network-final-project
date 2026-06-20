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

const router = express.Router();

router.post('/', protect, createPost);
router.get('/feed', protect, getFeed);
router.get('/my', protect, getMyPosts);
router.get('/group/:groupId', getPostsByGroup);
router.get('/:id', getPostById);
router.patch('/:id', protect, updatePost);
router.delete('/:id', protect, deletePost);
router.get('/', getPosts);

module.exports = router;
