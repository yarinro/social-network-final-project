/**
 * File: User.js
 *
 * Purpose:
 * Mongoose schema and model for application users (accounts, profiles,
 * friendships, and group memberships).
 *
 * Main responsibilities:
 * - Define identity fields (username, email, fullName) and credentials (passwordHash).
 * - Store role for authorization ('user' | 'admin').
 * - Reference friends (other Users) and groups the user belongs to.
 *
 * Connections:
 * - Used by authController (register/login), userController, groupController,
 *   postController, messageController, socket.js, and seed.js.
 * - Referenced by Group.manager/members/pendingMembers, Post.author/likes,
 *   and Message.from/to.
 *
 * Important concepts:
 * ObjectId refs + populate(), unique indexes on username/email, enum roles,
 * timestamps, storing bcrypt hashes (never plain passwords), and bidirectional
 * friendship/group arrays that controllers must keep in sync manually.
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      // Normalize so "Alex@Demo.com" and "alex@demo.com" collide as one account.
      lowercase: true,
      trim: true
    },
    // bcrypt hash only — plain passwords are never stored or returned by the API.
    passwordHash: {
      type: String,
      required: true
    },
    bio: {
      type: String,
      default: ''
    },
    profileImageUrl: {
      type: String,
      default: ''
    },
    role: {
      type: String,
      // Controllers check role === 'admin' for elevated permissions.
      enum: ['user', 'admin'],
      default: 'user'
    },
    // Mutual friendship: when A befriends B, both users' friends arrays are updated.
    friends: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    // Mirror of Group.members for the groups this user has joined.
    // Deleting a group or removing a member must update both sides.
    groups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group'
      }
    ]
  },
  {
    // Adds createdAt and updatedAt automatically.
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);
