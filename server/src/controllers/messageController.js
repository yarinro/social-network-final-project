/**
 * @file messageController.js
 * @description Direct-messaging (DM) controller for the MERN social-network API.
 *
 * Purpose:
 *   Implements private one-to-one messaging: create a message, load a
 *   conversation with another user, list all messages involving the current
 *   user, and mark a received message as read.
 *
 * Responsibilities:
 *   - Validate recipient and content; reject self-messaging
 *   - Persist messages with from/to refs and an isRead flag
 *   - Populate sender/recipient user fields for client-friendly responses
 *   - Enforce that only the recipient may mark a message as read (403 otherwise)
 *
 * Connections:
 *   - Models: Message, User
 *   - Auth: all handlers expect `req.user` from JWT middleware (sender identity)
 *   - Routes: typically under /api/messages
 *
 * Important concepts for defense:
 *   - Messages are directional (from → to); conversations are reconstructed
 *     with $or matching both directions between two user ids
 *   - populate() replaces ObjectIds with selected user fields for the UI
 *   - Permission check on markAsRead uses message.to vs req.user._id
 *   - sort({ createdAt: 1 }) = chronological thread; -1 = newest first inbox
 */

const Message = require('../models/Message');
const User = require('../models/User');

/** Safe user fields embedded when populating from/to on a message. */
const userFields = 'username fullName email profileImageUrl';

/**
 * Helper that populates both ends of a message query with display fields.
 * Keeps populate logic in one place so every response shape stays consistent.
 *
 * @param {import('mongoose').Query} query - A Message find/findById query
 * @returns {import('mongoose').Query} The same query with from/to populated
 */
const populateMessage = (query) => {
  return query.populate('from', userFields).populate('to', userFields);
};

/**
 * Creates a new direct message from the authenticated user to `to`.
 * Sets isRead to false so the recipient's unread state starts correctly.
 *
 * @param {import('express').Request} req - Body: { to, content }; sender = req.user
 * @param {import('express').Response} res - 201 populated message or 400/404/500
 */
const createMessage = async (req, res) => {
  try {
    const { to, content } = req.body;

    if (!to || !content) {
      return res.status(400).json({ message: 'Recipient and content are required' });
    }

    // Prevent accidental or spammy self-DMs
    if (to === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot send a message to yourself' });
    }

    const recipient = await User.findById(to);

    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    const message = await Message.create({
      from: req.user._id,
      to,
      content,
      isRead: false
    });

    // Re-fetch with populate so the client gets usernames, not only ObjectIds
    const populatedMessage = await populateMessage(Message.findById(message._id));

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Loads the full conversation between the current user and params.userId.
 * Matches messages in either direction and sorts oldest → newest for a chat UI.
 *
 * @param {import('express').Request} req - params.userId = the other participant
 * @param {import('express').Response} res - Chronological array of populated messages
 */
const getConversation = async (req, res) => {
  try {
    const otherUser = await User.findById(req.params.userId);

    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const messages = await populateMessage(
      Message.find({
        // $or: include both "I sent" and "they sent" rows for this pair
        $or: [
          { from: req.user._id, to: req.params.userId },
          { from: req.params.userId, to: req.user._id }
        ]
      }).sort({ createdAt: 1 }) // 1 = ascending (oldest first, like a chat thread)
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Returns every message where the current user is sender or recipient.
 * Sorted newest first — useful for an inbox / recent-activity view.
 *
 * @param {import('express').Request} req - Requires authenticated req.user
 * @param {import('express').Response} res - Populated messages, newest first
 */
const getMessages = async (req, res) => {
  try {
    const messages = await populateMessage(
      Message.find({
        // Any message involving this user, regardless of direction
        $or: [{ from: req.user._id }, { to: req.user._id }]
      }).sort({ createdAt: -1 }) // -1 = descending (newest first)
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Marks a single message as read.
 * Authorization: only the recipient (`message.to`) may flip isRead — the
 * sender cannot mark their own outgoing message as read for the other party.
 *
 * @param {import('express').Request} req - params.id = message ObjectId
 * @param {import('express').Response} res - Updated populated message or 403/404
 */
const markAsRead = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Permission: compare ObjectIds as strings; 403 if caller is not the recipient
    if (message.to.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the receiver can mark this message as read' });
    }

    message.isRead = true;
    await message.save();

    const updatedMessage = await populateMessage(Message.findById(message._id));

    res.json(updatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createMessage,
  getConversation,
  getMessages,
  markAsRead
};
