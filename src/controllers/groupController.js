const Group = require('../models/Group');
const Post = require('../models/Post');
const User = require('../models/User');

const userFields = 'username fullName email';

const populateGroup = (query, includePending = true) => {
  query.populate('manager', userFields).populate('members', userFields);

  if (includePending) {
    query.populate('pendingMembers', userFields);
  }

  return query;
};

const canManageGroup = (group, user) => {
  const isManager = group.manager.toString() === user._id.toString();
  const isAdmin = user.role === 'admin';

  return isManager || isAdmin;
};

const enrichManagerGroups = async (groupsList, user) => {
  if (!user) {
    return groupsList;
  }

  return Promise.all(
    groupsList.map(async (group) => {
      const managerId = group.manager._id || group.manager;

      if (managerId.toString() !== user._id.toString() && user.role !== 'admin') {
        return group;
      }

      try {
        const detailedGroup = await populateGroup(Group.findById(group._id));
        return detailedGroup || group;
      } catch {
        return group;
      }
    })
  );
};

const createGroup = async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    const group = await Group.create({
      name,
      description: description || '',
      isPrivate: isPrivate || false,
      manager: req.user._id,
      members: [req.user._id],
      pendingMembers: []
    });

    const populatedGroup = await populateGroup(
      Group.findById(group._id),
      false
    );

    res.status(201).json(populatedGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getGroups = async (req, res) => {
  try {
    const groups = await populateGroup(Group.find(), false);

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const searchGroups = async (req, res) => {
  try {
    const { name, isPrivate, manager, minMembers } = req.query;
    const filter = {};

    if (name) {
      filter.name = { $regex: name, $options: 'i' };
    }

    if (isPrivate === 'true') {
      filter.isPrivate = true;
    } else if (isPrivate === 'false') {
      filter.isPrivate = false;
    }

    if (manager) {
      const managers = await User.find({
        $or: [
          { username: { $regex: manager, $options: 'i' } },
          { fullName: { $regex: manager, $options: 'i' } }
        ]
      }).select('_id');

      filter.manager = { $in: managers.map((item) => item._id) };
    }

    let groups = await Group.find(filter);

    if (minMembers) {
      const minimum = Number(minMembers);

      if (!Number.isNaN(minimum)) {
        groups = groups.filter((group) => group.members.length >= minimum);
      }
    }

    const groupIds = groups.map((group) => group._id);
    const populatedGroups = await populateGroup(
      Group.find({ _id: { $in: groupIds } }).sort({ createdAt: -1 }),
      false
    );

    const enrichedGroups = await enrichManagerGroups(populatedGroups, req.user);

    res.json(enrichedGroups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getGroupById = async (req, res) => {
  try {
    const group = await populateGroup(Group.findById(req.params.id));

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!canManageGroup(group, req.user)) {
      return res.status(403).json({ message: 'Not authorized to update this group' });
    }

    const { name, description, isPrivate } = req.body;

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ message: 'Group name cannot be empty' });
      }

      group.name = name;
    }

    if (description !== undefined) {
      group.description = description;
    }

    if (isPrivate !== undefined) {
      group.isPrivate = isPrivate;
    }

    await group.save();

    const updatedGroup = await populateGroup(Group.findById(group._id));

    res.json(updatedGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!canManageGroup(group, req.user)) {
      return res.status(403).json({ message: 'Not authorized to delete this group' });
    }

    await Post.deleteMany({ group: group._id });
    await User.updateMany(
      { groups: group._id },
      { $pull: { groups: group._id } }
    );
    await group.deleteOne();

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const joinGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const userId = req.user._id.toString();

    if (group.members.some((memberId) => memberId.toString() === userId)) {
      return res.status(400).json({ message: 'You are already a member of this group' });
    }

    if (group.pendingMembers.some((memberId) => memberId.toString() === userId)) {
      return res.status(400).json({ message: 'You already have a pending request for this group' });
    }

    if (group.isPrivate) {
      group.pendingMembers.push(req.user._id);
      await group.save();

      const updatedGroup = await populateGroup(Group.findById(group._id));

      return res.json({
        message: 'Join request sent. Waiting for manager approval.',
        group: updatedGroup
      });
    }

    group.members.push(req.user._id);
    await group.save();

    const updatedGroup = await populateGroup(Group.findById(group._id), false);

    res.json({
      message: 'You have joined the group successfully.',
      group: updatedGroup
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const approveMember = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!canManageGroup(group, req.user)) {
      return res.status(403).json({ message: 'Not authorized to approve members' });
    }

    const { userId } = req.params;

    if (!group.pendingMembers.some((memberId) => memberId.toString() === userId)) {
      return res.status(400).json({ message: 'User is not in pending members list' });
    }

    group.pendingMembers = group.pendingMembers.filter(
      (memberId) => memberId.toString() !== userId
    );
    group.members.push(userId);

    await group.save();

    const updatedGroup = await populateGroup(Group.findById(group._id));

    res.json(updatedGroup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createGroup,
  getGroups,
  searchGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  joinGroup,
  approveMember
};
