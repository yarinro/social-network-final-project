const express = require('express');
const {
  createGroup,
  getGroups,
  getGroupById,
  joinGroup,
  approveMember
} = require('../controllers/groupController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createGroup);
router.get('/', getGroups);
router.post('/:id/join', protect, joinGroup);
router.post('/:id/approve/:userId', protect, approveMember);
router.get('/:id', getGroupById);

module.exports = router;
