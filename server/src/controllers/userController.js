/**
 * @file userController.js
 * @description User profile, discovery, friendship, and account-lifecycle
 * controller for the MERN social-network API.
 *
 * Purpose:
 *   Manages everything about user identity after authentication: listing and
 *   searching users, reading/updating one's own profile, viewing others,
 *   adding/removing friends, and safely deleting an account with related data.
 *
 * Responsibilities:
 *   - Expose public vs private profile field sets (never leak passwordHash)
 *   - Populate friends and groups when a richer profile is needed
 *   - Enforce mutual friendship (both users' friends arrays stay in sync)
 *   - Cascade cleanup on account deletion (friends, groups, posts, messages)
 *   - Block deletion while the user still manages groups (data integrity)
 *
 * Connections:
 *   - Models: User, Group, Post, Message
 *   - Auth: most handlers expect `req.user` from JWT middleware
 *   - Routes: typically under /api/users (CRUD-ish profile + friends + search)
 *
 * Important concepts for defense:
 *   - .select('-passwordHash') / explicit field lists = projection (security)
 *   - .populate() replaces ObjectId refs with selected documents for the client
 *   - $pull / $ne / $in / $regex are MongoDB query operators used below
 *   - Friendship is bidirectional: add/remove updates BOTH user documents
 *   - Account deletion is multi-step: unlink refs, delete owned content, then user
 */

const User = require('../models/User');
const Group = require('../models/Group');
const Post = require('../models/Post');
const Message = require('../models/Message');

/** Fields returned when populating friend references (safe subset). */
const friendFields = 'username fullName email profileImageUrl';
/** Fields returned when populating group references. */
const groupFields = 'name description isPrivate';

/**
 * Lists all users with a limited projection (admin/directory style listing).
 * Does not include passwordHash; includes role and relationship ids.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res - JSON array of users
 */
const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('_id username fullName email role friends groups createdAt profileImageUrl');

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Returns the authenticated user's full profile with friends and groups populated.
 * Uses req.user._id from JWT middleware — the client cannot request another user's
 * "my profile" through this endpoint.
 *
 * @param {import('express').Request} req - Requires authenticated req.user
 * @param {import('express').Response} res - User document or 404
 */
const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      // Leading '-' excludes passwordHash from the result
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

/**
 * Partially updates the authenticated user's profile fields.
 * Only fullName, bio, and profileImageUrl are writable here; undefined fields
 * are left unchanged (partial update pattern).
 *
 * @param {import('express').Request} req - Body may include fullName, bio, profileImageUrl
 * @param {import('express').Response} res - Updated user without passwordHash
 */
const updateMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { fullName, bio, profileImageUrl } = req.body;

    // !== undefined allows clearing bio/image with empty string while skipping omitted keys
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

/**
 * Permanently deletes the authenticated user's account and related data.
 * Refuses if the user still manages any groups (must transfer/delete first).
 * Then unlinks friendships and memberships, deletes posts/messages, and
 * finally removes the user document.
 *
 * @param {import('express').Request} req - Requires authenticated req.user
 * @param {import('express').Response} res - Success message or 400 if still a group manager
 */
const deleteMyAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    // Integrity guard: orphaned groups with a deleted manager would break the app
    const managedGroupsCount = await Group.countDocuments({ manager: userId });

    if (managedGroupsCount > 0) {
      return res.status(400).json({
        message:
          'You manage one or more groups. Delete or transfer them before deleting your account.'
      });
    }

    // $pull removes this userId from every other user's friends array
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
    // Delete DMs where the user was either sender or recipient
    await Message.deleteMany({
      $or: [{ from: userId }, { to: userId }]
    });

    await User.findByIdAndDelete(userId);

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Returns a minimal public profile for any user by id.
 * Intentionally omits email, friends, groups, and role — safe for strangers.
 *
 * @param {import('express').Request} req - params.id = target user ObjectId
 * @param {import('express').Response} res - Public fields or 404
 */
const getPublicProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      '_id username fullName bio profileImageUrl createdAt'
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Returns a full user document by id (minus passwordHash), with friends
 * and groups populated. Richer than getPublicProfile — used when the client
 * needs relationship context for a specific user.
 *
 * @param {import('express').Request} req - params.id = target user ObjectId
 * @param {import('express').Response} res - Populated user or 404
 */
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

/**
 * Searches users by optional username, fullName, and/or email query params.
 * Always excludes the current user. When friendsOnly=true, restricts results
 * to ids already in the caller's friends list.
 *
 * @param {import('express').Request} req - Query: username, fullName, email, friendsOnly
 * @param {import('express').Response} res - Up to 20 matching users (no passwordHash)
 */
const searchUsers = async (req, res) => {
  try {
    const { username, fullName, email, friendsOnly } = req.query;
    // $ne = "not equal" — never return yourself in search results
    const filter = { _id: { $ne: req.user._id } };

    if (username) {
      // $regex + 'i' = case-insensitive partial match on username
      filter.username = { $regex: username, $options: 'i' };
    }

    if (fullName) {
      filter.fullName = { $regex: fullName, $options: 'i' };
    }

    if (email) {
      filter.email = { $regex: email, $options: 'i' };
    }

    if (friendsOnly === 'true') {
      const currentUser = await User.findById(req.user._id).select('friends');

      if (!currentUser || currentUser.friends.length === 0) {
        return res.json([]);
      }

      // $in: _id must be one of the friend ObjectIds (overrides the earlier $ne)
      filter._id = { $in: currentUser.friends };
    }

    const users = await User.find(filter)
      .select('-passwordHash')
      .limit(20);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Adds a mutual friendship between the authenticated user and params.id.
 * Pushes each user's id onto the other's friends array, then saves both.
 *
 * @param {import('express').Request} req - params.id = friend to add
 * @param {import('express').Response} res - Updated current user or 400/404
 */
const addFriend = async (req, res) => {
  try {
    // Compare string forms — ObjectId vs string would fail a strict === check
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

    // Mutual friendship: both documents must reference each other
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

/**
 * Removes a mutual friendship with params.id.
 * Filters the id out of both users' friends arrays so the graph stays consistent.
 *
 * @param {import('express').Request} req - params.id = friend to remove
 * @param {import('express').Response} res - Updated current user or 400/404
 */
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

    // Keep both sides in sync — one-sided friendship would break UI assumptions
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
  getPublicProfile,
  getUserById,
  searchUsers,
  addFriend,
  removeFriend
};
