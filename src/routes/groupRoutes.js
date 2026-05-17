const express = require('express');
const {
  getGroups,
  getGroupById,
  createGroup
} = require('../controllers/groupController');

const router = express.Router();

router.get('/', getGroups);
router.get('/:id', getGroupById);
router.post('/', createGroup);

module.exports = router;
