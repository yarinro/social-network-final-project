/**
 * @file authController.js
 * @description Authentication controller for the MERN social-network API.
 *
 * Purpose:
 *   Handles user registration, login, and retrieval of the currently
 *   authenticated user. This is the entry point for identity in the app —
 *   every protected route later depends on a JWT issued here.
 *
 * Responsibilities:
 *   - Validate registration/login input from the request body
 *   - Hash passwords with bcrypt before storing them (never store plaintext)
 *   - Issue signed JWTs that the client sends back on subsequent requests
 *   - Strip sensitive fields (passwordHash) before returning user objects
 *
 * Connections:
 *   - Models: User (MongoDB / Mongoose)
 *   - Libraries: bcryptjs (password hashing), jsonwebtoken (token creation)
 *   - Middleware: auth middleware verifies the JWT and attaches `req.user`
 *     before handlers like `getMe` run
 *   - Routes: typically mounted under /api/auth (register, login, me)
 *
 * Important concepts for defense:
 *   - bcrypt salt rounds (cost factor 10): slows brute-force attacks
 *   - JWT payload carries only the user id; the secret must stay in .env
 *   - Same generic error for bad email vs bad password on login (avoids
 *     revealing which accounts exist)
 *   - sanitizeUser uses toObject() so we can safely delete passwordHash
 *     without mutating the Mongoose document in unexpected ways
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Reads JWT_SECRET from the environment.
 * Fails fast if missing so tokens are never signed with an undefined secret.
 *
 * @returns {string} The secret used to sign and verify JWTs
 * @throws {Error} When JWT_SECRET is not set in process.env
 */
const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing. Please add it to your .env file.');
  }

  return process.env.JWT_SECRET;
};

/**
 * Creates a signed JWT for a newly registered or logged-in user.
 * The payload is minimal ({ id }) so the token stays small and does not
 * embed roles or PII that could go stale before expiry.
 *
 * @param {import('mongoose').Types.ObjectId|string} userId - MongoDB user _id
 * @returns {string} Signed JWT valid for 7 days
 */
const createToken = (userId) => {
  // expiresIn: '7d' — client must re-login after a week (or store a refresh flow)
  return jwt.sign({ id: userId }, getJwtSecret(), { expiresIn: '7d' });
};

/**
 * Converts a Mongoose user document to a plain object and removes the
 * password hash so it never reaches the client in JSON responses.
 *
 * @param {import('mongoose').Document} user - User document from MongoDB
 * @returns {Object} Plain user object without passwordHash
 */
const sanitizeUser = (user) => {
  // toObject() turns the Mongoose document into a plain JS object we can mutate
  const userObj = user.toObject();
  delete userObj.passwordHash;
  return userObj;
};

/**
 * Registers a new user account.
 * Checks uniqueness of email/username, hashes the password, creates the
 * user document, and returns a JWT so the client is logged in immediately.
 *
 * @param {import('express').Request} req - Expects username, fullName, email, password in body
 * @param {import('express').Response} res - 201 with { user, token } or error status
 */
const register = async (req, res) => {
  try {
    const { username, fullName, email, password } = req.body;

    if (!username || !fullName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // $or: match if EITHER email OR username is already taken (one query)
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email or username already exists' });
    }

    // Second arg (10) = bcrypt salt rounds / cost factor — higher = slower & safer
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      fullName,
      email,
      passwordHash
    });

    const token = createToken(user._id);

    res.status(201).json({
      user: sanitizeUser(user),
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Authenticates an existing user with email + password.
 * On success returns a sanitized user and a fresh JWT.
 * Uses the same 401 message for unknown email and wrong password so
 * attackers cannot enumerate valid accounts.
 *
 * @param {import('express').Request} req - Expects email, password in body
 * @param {import('express').Response} res - 200 with { user, token } or 401/500
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Same message as wrong password — do not reveal whether the email exists
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // bcrypt.compare hashes the candidate with the stored salt and checks equality
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = createToken(user._id);

    res.json({
      user: sanitizeUser(user),
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Returns the authenticated user already attached by auth middleware.
 * No DB query here — `req.user` was loaded when the JWT was verified.
 *
 * @param {import('express').Request} req - Must have req.user from protect middleware
 * @param {import('express').Response} res - JSON { user }
 */
const getMe = (req, res) => {
  res.json({ user: req.user });
};

module.exports = {
  register,
  login,
  getMe
};
