/**
 * @fileoverview Post routes — mounted at `/api/posts` in `app.js`.
 *
 * Purpose:
 *   Create posts, browse the personalized feed / own posts / group posts,
 *   fetch or mutate a single post, and toggle likes.
 *
 * Controllers (`postController`):
 *   - createPost, getPosts, getFeed, getMyPosts, getPostsByGroup,
 *     getPostById, updatePost, deletePost, toggleLike
 *
 * Middleware:
 *   - `protect` — required for create, feed, my posts, group posts, like,
 *     update, and delete
 *   - `validateObjectId('groupId')` — on `/group/:groupId`
 *   - `validateObjectId('id')` — on single-post routes (`/:id`, `/:id/like`)
 *
 * Public vs protected:
 *   - PUBLIC:  GET `/:id` (`getPostById`), GET `/` (`getPosts`) — no `protect`
 *   - PROTECTED: POST `/`, GET `/feed`, GET `/my`, GET `/group/:groupId`,
 *     PATCH `/:id/like`, PATCH `/:id`, DELETE `/:id`
 *
 * Query params vs route params:
 *   - GET `/` and GET `/group/:groupId` — optional filters/sort via `req.query`
 *     (e.g. `text`, `author`, `group`, `fromDate`, `toDate`, `hasImage`,
 *     `hasVideo`, `sortBy`, `sortOrder`) handled in the controller
 *   - GET `/feed`, GET `/my` — identity from JWT (`req.user`); no `:id`
 *   - GET `/group/:groupId` — group id in `req.params.groupId`
 *   - `/:id` and `/:id/like` — post id in `req.params.id`
 *
 * WHY `/feed`, `/my`, AND RELATED STATIC PATHS MUST APPEAR BEFORE `/:id`:
 *   Express matches in order. `/feed` and `/my` are single-segment literals.
 *   If `GET /:id` were first, `/api/posts/feed` would set `id = "feed"` and
 *   fail ObjectId validation instead of loading the feed. `/group/:groupId`
 *   is multi-segment (safer from colliding with bare `/:id`), but keeping it
 *   with the other non-id list routes makes the “special collections first,
 *   then resource-by-id” pattern clear. `PATCH /:id/like` is registered before
 *   `GET|PATCH|DELETE /:id` so the like sub-action is an explicit path.
 */

const express = require('express');
const {
  createPost,
  getPosts,
  getFeed,
  getMyPosts,
  getPostsByGroup,
  getPostById,
  updatePost,
  deletePost,
  toggleLike
} = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');

const router = express.Router();

// Feed, my posts, and like routes must stay before /:id
router.post('/', protect, createPost);
// Literals /feed and /my would otherwise be captured as :id
router.get('/feed', protect, getFeed);
router.get('/my', protect, getMyPosts);
// Route param :groupId (validated); optional filters still come from req.query
router.get('/group/:groupId', protect, validateObjectId('groupId'), getPostsByGroup);
router.patch('/:id/like', protect, validateObjectId('id'), toggleLike);
// Public single-post fetch — validateObjectId only (no protect)
router.get('/:id', validateObjectId('id'), getPostById);
router.patch('/:id', protect, validateObjectId('id'), updatePost);
router.delete('/:id', protect, validateObjectId('id'), deletePost);
// Public list — query-string filters applied inside getPosts
router.get('/', getPosts);

module.exports = router;
