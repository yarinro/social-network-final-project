const Message = require('../models/Message');
const User = require('../models/User');

const userFields = 'username fullName email';

const populateMessage = (query) => {
  return query.populate('from', userFields).populate('to', userFields);
};

const createMessage = async (req, res) => {
  try {
    const { to, content } = req.body;

    if (!to || !content) {
      return res.status(400).json({ message: 'Recipient and content are required' });
    }

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

    const populatedMessage = await populateMessage(Message.findById(message._id));

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getConversation = async (req, res) => {
  try {
    const otherUser = await User.findById(req.params.userId);

    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const messages = await populateMessage(
      Message.find({
        $or: [
          { from: req.user._id, to: req.params.userId },
          { from: req.params.userId, to: req.user._id }
        ]
      }).sort({ createdAt: 1 })
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const messages = await populateMessage(
      Message.find({
        $or: [{ from: req.user._id }, { to: req.user._id }]
      }).sort({ createdAt: -1 })
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

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
