/**
 * File: Message.js
 *
 * Purpose:
 * Mongoose schema and model for private direct messages between two users.
 *
 * Main responsibilities:
 * - Store sender (from), recipient (to), text content, and read status.
 * - Provide timestamps for conversation ordering.
 *
 * Connections:
 * - messageController handles REST create/list/mark-read operations.
 * - socket.js creates Message documents on 'sendMessage' then emits them live.
 * - Both layers populate from/to with safe user fields (no passwordHash).
 *
 * Important concepts:
 * Pairwise messaging (from/to ObjectIds), isRead flag, populate on both ends,
 * and the split between REST history and Socket.IO real-time delivery.
 */

const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true
    },
    // Used by mark-as-read flows so the inbox can show unread state.
    isRead: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Message', messageSchema);
