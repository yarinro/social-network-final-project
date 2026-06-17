const express = require('express');
const {
  createPost,
  getPosts,
  getPostsByGroup,
  getPostById,
  deletePost
} = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createPost);
router.get('/', getPosts);
router.get('/group/:groupId', getPostsByGroup);
router.get('/:id', getPostById);
router.delete('/:id', protect, deletePost);

module.exports = router;
