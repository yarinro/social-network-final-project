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
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createGroup);
router.get('/search', protect, searchGroups);
router.get('/', getGroups);
router.post('/:id/join', protect, joinGroup);
router.post('/:id/approve/:userId', protect, approveMember);
router.patch('/:id', protect, updateGroup);
router.delete('/:id', protect, deleteGroup);
router.get('/:id', getGroupById);

module.exports = router;
