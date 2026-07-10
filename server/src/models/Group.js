/**
 * File: Group.js
 *
 * Purpose:
 * Mongoose schema and model for social groups (communities where posts live).
 *
 * Main responsibilities:
 * - Store group metadata (name, description, privacy flag).
 * - Track the manager (owner), approved members, and pending join requests.
 *
 * Connections:
 * - Used heavily by groupController and postController (posts require a group).
 * - User.groups mirrors membership; seed.js and controllers keep both in sync.
 * - Stats aggregation joins posts to groups via $lookup.
 *
 * Important concepts:
 * Public vs private groups (isPrivate), pendingMembers vs members,
 * manager ObjectId ref, and why membership is stored on both Group and User.
 */

const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    },
    // Private groups hide content from non-members; join may require approval.
    isPrivate: {
      type: Boolean,
      default: false
    },
    // Group manager can approve joins, manage members, and delete some posts.
    manager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // Approved members who can see private content and create posts (per rules).
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    // Users who requested to join a private group but are not members yet.
    // They must not be treated as approved members in permission checks.
    pendingMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Group', groupSchema);
