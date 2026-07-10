/**
 * @fileoverview Authentication routes — mounted at `/api/auth` in `app.js`.
 *
 * Purpose:
 *   Expose the public signup/login endpoints and the protected “current user”
 *   endpoint used after the client stores a JWT.
 *
 * Controllers:
 *   - `authController.register` — create a new user account
 *   - `authController.login`    — verify credentials and return a JWT
 *   - `authController.getMe`    — return the logged-in user from the token
 *
 * Middleware:
 *   - `protect` (`authMiddleware`) — verifies `Authorization: Bearer <token>`,
 *     loads the user, and attaches it to `req.user`. Applied only to `/me`.
 *
 * Public vs protected:
 *   - PUBLIC:  POST `/register`, POST `/login` (no JWT required)
 *   - PROTECTED: GET `/me` (requires a valid JWT via `protect`)
 *
 * Params / body:
 *   - Register and login read credentials from `req.body` (no route params).
 *   - `/me` identifies the user from the JWT (`req.user`), not from the URL.
 *
 * Route-order note:
 *   All paths here are static literals (`/register`, `/login`, `/me`), so there
 *   is no `/:id` conflict to worry about in this file.
 */

const express = require('express');
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Register and login are public; /me needs a valid token
router.post('/register', register);
router.post('/login', login);
// protect runs first: invalid/missing token never reaches getMe
router.get('/me', protect, getMe);

module.exports = router;
