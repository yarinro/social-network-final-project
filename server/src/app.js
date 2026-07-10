/**
 * File: app.js
 *
 * Purpose:
 * Builds and exports the Express application: global middleware, API route
 * mounts, and centralized error handling. Does not start listening; that
 * happens in server.js so Socket.IO can share the HTTP server.
 *
 * Main responsibilities:
 * - Enables CORS so the React CRA client (different origin/port) can call the API.
 * - Parses JSON request bodies with express.json().
 * - Mounts feature route modules under /api/... prefixes.
 * - Registers not-found and error middleware last in the stack.
 *
 * Connections:
 * - Used by server.js via http.createServer(app).
 * - Mounts auth, user, group, post, message, and stats route modules.
 * - Uses notFound and errorHandler from errorMiddleware.js.
 *
 * Important concepts:
 * Middleware order, route prefixes, CORS, JSON body parsing, and why
 * 404 / error handlers must be registered after all real routes.
 */

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const groupRoutes = require('./routes/groupRoutes');
const postRoutes = require('./routes/postRoutes');
const messageRoutes = require('./routes/messageRoutes');
const statsRoutes = require('./routes/statsRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Allow the React frontend (usually http://localhost:3000) to call this API
// from a different origin. Without CORS, browsers block cross-origin fetches.
app.use(cors());

// Parse application/json bodies into req.body. Controllers that read
// req.body.email, req.body.content, etc. depend on this middleware running first.
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Social Network API is running' });
});

// Each prefix maps a URL namespace to a route module. Example:
// POST /api/auth/login  ->  authRoutes  ->  authController.login
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/stats', statsRoutes);

// If no earlier route matched, create a 404 error and pass it to errorHandler.
// Must sit after all app.use('/api/...') mounts.
app.use(notFound);

// Express identifies error middleware by its 4-argument signature
// (err, req, res, next). It must be registered last so next(error) from
// routes or notFound reaches this handler.
app.use(errorHandler);

module.exports = app;
