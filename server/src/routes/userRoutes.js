/**
 * @fileoverview User routes — mounted at `/api/users` in `app.js`.
 *
 * Purpose:
 *   Profile CRUD for the logged-in user, user listing/search, public/full
 *   profile lookup by id, and friend add/remove.
 *
 * Controllers (`userController`):
 *   - getMyProfile / updateMyProfile / deleteMyAccount — operate on `req.user`
 *   - searchUsers — filter users via query string
 *   - getUsers — list all users
 *   - getPublicProfile / getUserById — load one user by route param `:id`
 *   - addFriend / removeFriend — mutate friendship with target `:id`
 *
 * Middleware:
 *   - `protect` — every route in this file requires a valid JWT
 *   - `validateObjectId('id')` — rejects non-ObjectId `:id` values with 400
 *     before the controller runs (used on all `/:id...` routes)
 *
 * Public vs protected:
 *   - ALL routes here are PROTECTED (each handler is preceded by `protect`).
 *
 * Query params vs route params:
 *   - GET `/search` — filters via `req.query` (`username`, `fullName`, `email`,
 *     `friendsOnly`); no `:id` in the path
 *   - GET|PATCH|DELETE `/me` — identity comes from the JWT (`req.user`), not URL
 *   - GET `/` — no params; returns the full user list
 *   - Routes with `/:id` — MongoDB user id in `req.params.id`
 *
 * WHY STATIC PATHS MUST APPEAR BEFORE `/:id`:
 *   Express matches routes in declaration order. A path like `/search` or `/me`
 *   is a single URL segment. If `GET /:id` were registered first, a request to
 *   `/api/users/search` would bind `id = "search"`, then `validateObjectId`
 *   would reject it (or the controller would look up a nonsense id). Declaring
 *   `/me` and `/search` first ensures those literals are matched correctly.
 */

const express = require('express');
const {
  getUsers,
  getMyProfile,
  updateMyProfile,
  deleteMyAccount,
  getPublicProfile,
  getUserById,
  searchUsers,
  addFriend,
  removeFriend
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');

const router = express.Router();

// Static routes must come before /:id so they are not treated as user ids
router.get('/me', protect, getMyProfile);
router.patch('/me', protect, updateMyProfile);
router.delete('/me', protect, deleteMyAccount);
// Query-string search (e.g. ?username=...&friendsOnly=true) — must stay above /:id
router.get('/search', protect, searchUsers);
router.get('/', protect, getUsers);
// :id routes — validateObjectId checks req.params.id before the controller
router.get('/:id/public', protect, validateObjectId('id'), getPublicProfile);
router.get('/:id', protect, validateObjectId('id'), getUserById);
router.post('/:id/friend', protect, validateObjectId('id'), addFriend);
router.delete('/:id/friend', protect, validateObjectId('id'), removeFriend);

module.exports = router;
