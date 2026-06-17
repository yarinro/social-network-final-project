const User = require('../models/User');

const friendFields = 'username fullName email';
const groupFields = 'name description isPrivate';

const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('_id username fullName email role friends groups createdAt');

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-passwordHash')
      .populate('friends', friendFields)
      .populate('groups', groupFields);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const searchUsers = async (req, res) => {
  try {
    const { query } = req.params;

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { fullName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    })
      .select('-passwordHash')
      .limit(20);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addFriend = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot add yourself as a friend' });
    }

    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentUser = await User.findById(req.user._id);

    const isAlreadyFriend = currentUser.friends.some(
      (friendId) => friendId.toString() === req.params.id
    );

    if (isAlreadyFriend) {
      return res.status(400).json({ message: 'User is already your friend' });
    }

    currentUser.friends.push(targetUser._id);
    targetUser.friends.push(currentUser._id);

    await currentUser.save();
    await targetUser.save();

    const updatedUser = await User.findById(req.user._id).select('-passwordHash');

    res.json({
      message: 'Friend added successfully',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeFriend = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentUser = await User.findById(req.user._id);

    const isFriend = currentUser.friends.some(
      (friendId) => friendId.toString() === req.params.id
    );

    if (!isFriend) {
      return res.status(400).json({ message: 'User is not in your friends list' });
    }

    currentUser.friends = currentUser.friends.filter(
      (friendId) => friendId.toString() !== req.params.id
    );
    targetUser.friends = targetUser.friends.filter(
      (friendId) => friendId.toString() !== req.user._id.toString()
    );

    await currentUser.save();
    await targetUser.save();

    const updatedUser = await User.findById(req.user._id).select('-passwordHash');

    res.json({
      message: 'Friend removed successfully',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  searchUsers,
  addFriend,
  removeFriend
};
