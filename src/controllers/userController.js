const User = require('../models/User');
const Group = require('../models/Group');
const Post = require('../models/Post');
const Message = require('../models/Message');

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

const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
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

const updateMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { fullName, bio, profileImageUrl } = req.body;

    if (fullName !== undefined) {
      if (!fullName.trim()) {
        return res.status(400).json({ message: 'Full name cannot be empty' });
      }

      user.fullName = fullName.trim();
    }

    if (bio !== undefined) {
      user.bio = bio;
    }

    if (profileImageUrl !== undefined) {
      user.profileImageUrl = profileImageUrl;
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select('-passwordHash');

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteMyAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    const managedGroupsCount = await Group.countDocuments({ manager: userId });

    if (managedGroupsCount > 0) {
      return res.status(400).json({
        message:
          'You manage one or more groups. Delete or transfer them before deleting your account.'
      });
    }

    await User.updateMany(
      { friends: userId },
      { $pull: { friends: userId } }
    );

    await Group.updateMany(
      { members: userId },
      { $pull: { members: userId } }
    );

    await Group.updateMany(
      { pendingMembers: userId },
      { $pull: { pendingMembers: userId } }
    );

    await Post.deleteMany({ author: userId });
    await Message.deleteMany({
      $or: [{ from: userId }, { to: userId }]
    });

    await User.findByIdAndDelete(userId);

    res.json({ message: 'Account deleted successfully' });
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
    const { username, fullName, email } = req.query;
    const filter = { _id: { $ne: req.user._id } };

    if (username) {
      filter.username = { $regex: username, $options: 'i' };
    }

    if (fullName) {
      filter.fullName = { $regex: fullName, $options: 'i' };
    }

    if (email) {
      filter.email = { $regex: email, $options: 'i' };
    }

    const users = await User.find(filter)
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
  getMyProfile,
  updateMyProfile,
  deleteMyAccount,
  getUserById,
  searchUsers,
  addFriend,
  removeFriend
};
