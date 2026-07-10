/**
 * File: authMiddleware.js
 *
 * Purpose:
 * Express authentication middleware. Verifies a JWT Bearer token and attaches
 * the corresponding User document to req.user for downstream controllers.
 *
 * Main responsibilities:
 * - Extract the token from the Authorization header.
 * - Verify the JWT signature and expiry with JWT_SECRET.
 * - Load the user from MongoDB (without the password hash).
 * - Reject requests that lack a valid token or user.
 *
 * Connections:
 * - Applied on protected routes in authRoutes, userRoutes, groupRoutes,
 *   postRoutes, messageRoutes, and statsRoutes via protect.
 * - Uses the User model and jsonwebtoken.
 * - Controllers then use req.user._id, req.user.role, etc. for authorization.
 *
 * Important concepts:
 * Authentication vs authorization (this file only proves identity),
 * Bearer tokens, JWT payload { id }, select('-passwordHash'), and 401 responses.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protects a route: only continues if the request carries a valid JWT.
 *
 * Authentication (this middleware) answers "who is calling?".
 * Authorization (checked later in controllers) answers "are they allowed?".
 *
 * Flow:
 * 1. Read "Authorization: Bearer <token>".
 * 2. jwt.verify checks signature and expiry using JWT_SECRET.
 * 3. The token payload contains { id: userId } (see authController.createToken).
 * 4. Load that user and set req.user so controllers do not re-parse the token.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const protect = async (req, res, next) => {
  try {
    let token;

    // Standard Bearer scheme: "Authorization: Bearer eyJhbGciOi..."
    // split(' ')[1] isolates the token string after the word "Bearer".
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: 'JWT_SECRET is missing. Please add it to your .env file.'
      });
    }

    // Throws if the token is forged, malformed, or expired.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Never attach passwordHash to req.user; controllers may send req.user
    // back to the client (for example getMe).
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      // Token was valid cryptographically, but the user was deleted afterward.
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, invalid token' });
  }
};

module.exports = { protect };
