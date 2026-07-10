/**
 * @fileoverview Message routes — mounted at `/api/messages` in `app.js`.
 *
 * Purpose:
 *   REST persistence for direct messages (create, list, load a 1:1 conversation,
 *   mark as read). Real-time delivery is handled separately via Socket.IO; these
 *   routes store and retrieve messages in MongoDB.
 *
 * Controllers (`messageController`):
 *   - createMessage — send a message (body: `to`, `content`)
 *   - getConversation — thread between the logged-in user and `:userId`
 *   - getMessages — messages involving the logged-in user
 *   - markAsRead — mark one message (`:id`) as read
 *
 * Middleware:
 *   - `protect` — every route requires a valid JWT (`req.user` is the sender /
 *     participant)
 *   - `validateObjectId('userId')` — conversation partner id
 *   - `validateObjectId('id')` — message document id on mark-as-read
 *
 * Public vs protected:
 *   - ALL routes here are PROTECTED.
 *
 * Query params vs route params:
 *   - POST `/` and GET `/` — no route params; create uses `req.body`, list uses
 *     `req.user` from the JWT
 *   - GET `/conversation/:userId` — other participant in `req.params.userId`
 *   - PATCH `/:id/read` — message id in `req.params.id`
 *
 * WHY `/conversation/:userId` IS DECLARED BEFORE `/:id/read`:
 *   Keeping the named “conversation” collection path above the generic
 *   `/:id...` pattern documents the same Express ordering rule used elsewhere:
 *   specific/static prefixes first, then id-based resource actions. A request
 *   to `/conversation/...` would not match `/:id/read` (different shape), but
 *   declaring conversation first avoids any future single-segment `/:id`
 *   collision and matches the project’s route-ordering convention.
 */

const express = require('express');
const {
  createMessage,
  getConversation,
  getMessages,
  markAsRead
} = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validateObjectId');

const router = express.Router();

// REST endpoints for stored messages (chat also uses Socket.IO)
router.post('/', protect, createMessage);
// Specific /conversation/:userId before generic /:id/read
router.get(
  '/conversation/:userId',
  protect,
  validateObjectId('userId'),
  getConversation
);
router.get('/', protect, getMessages);
// :id is the message document id (not a user id)
router.patch('/:id/read', protect, validateObjectId('id'), markAsRead);

module.exports = router;
