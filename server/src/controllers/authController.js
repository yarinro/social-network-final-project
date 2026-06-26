const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is missing. Please add it to your .env file.');
  }

  return process.env.JWT_SECRET;
};

const createToken = (userId) => {
  return jwt.sign({ id: userId }, getJwtSecret(), { expiresIn: '7d' });
};

// Remove password hash before sending user data to the client
const sanitizeUser = (user) => {
  const userObj = user.toObject();
  delete userObj.passwordHash;
  return userObj;
};

const register = async (req, res) => {
  try {
    const { username, fullName, email, password } = req.body;

    if (!username || !fullName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email or username already exists' });
    }

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

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

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

const getMe = (req, res) => {
  res.json({ user: req.user });
};

module.exports = {
  register,
  login,
  getMe
};
