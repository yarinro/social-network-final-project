const express = require('express');
const {
  getPostsByGroup,
  getPostsByMonth
} = require('../controllers/statsController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/posts-by-group', protect, getPostsByGroup);
router.get('/posts-by-month', protect, getPostsByMonth);

module.exports = router;
