const express = require('express');
const {
  getPosts,
  getPostById,
  createPost
} = require('../controllers/postController');

const router = express.Router();

router.get('/', getPosts);
router.get('/:id', getPostById);
router.post('/', createPost);

module.exports = router;
