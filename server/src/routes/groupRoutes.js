/**
 * @fileoverview Group routes — mounted at `/api/groups` in `app.js`.
 *
 * Purpose:
 *   Create/list/search groups, manage membership (join / approve), update or
 *   delete a group, and fetch posts that belong to a specific group.
 *
 * Controllers:
 *   - `groupController`: createGroup, getGroups, getMyGroups, searchGroups,
 *     getGroupById, updateGroup, deleteGroup, joinGroup, approveMember
 *   - `postController.getGroupPosts` — posts for one group (shared with posts domain)
 *
 * Middleware:
 *   - `protect` — required on every route except the public group list
 *   - `validateObjectId('id')` — validates the group id in `req.params.id`
 *   - `validateObjectId('id', 'userId')` — validates both group and member ids
 *     on the approve route
 *
 * Public vs protected:
 *   - PUBLIC:  GET `/` (`getGroups`) — no `protect`; anyone can browse groups
 *   - PROTECTED: all other routes (create, search, my groups, join, approve,
 *     posts, update, delete, get-by-id)
 *
 * Query params vs route params:
 *   - GET `/search` — filters via `req.query` (`name`, `isPrivate`, `manager`,
 *     `minMembers`); path has no `:id`
 *   - GET `/my` — uses `req.user._id` from the JWT; no route params
 *   - `/:id`, `/:id/join`, `/:id/posts`, etc. — group id in `req.params.id`
 *   - POST `/:id/approve/:userId` — group id + target user id as route params
 *   - GET `/:id/posts` — may also accept post filter/sort query strings in the
 *     controller (`buildPostQueryFilter` / `getPostSort`)
 *
 * WHY `/search` AND `/my` MUST APPEAR BEFORE `/:id`:
 *   Both are single-segment static paths. If `GET /:id` (or any `/:id...`
 *   handler that could collide) were registered first, Express would treat
 *   `"search"` or `"my"` as a MongoDB ObjectId string. Those requests would
 *   fail validation or return 404 instead of running search / “my groups”.
 *   Multi-segment paths like `/:id/join` do not collide with `/search`, but
 *   the static single-segment routes still must stay above `/:id`.
 */

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

// /search and /my must stay before /:id
router.post('/', protect, createGroup);
// Query-param search — literal /search must not be captured by /:id
router.get('/search', protect, searchGroups);
router.get('/my', protect, getMyGroups);
// Public list — intentionally no protect middleware
router.get('/', getGroups);
router.post('/:id/join', protect, validateObjectId('id'), joinGroup);
// Two route params validated: group id and the member being approved
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
