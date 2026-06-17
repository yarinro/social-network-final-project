const Group = require('../models/Group');

const userFields = 'username fullName email';

const populateGroup = (query, includePending = true) => {
  query.populate('manager', userFields).populate('members', userFields);

  if (includePending) {
    query.populate('pendingMembers', userFields);
  }

  return query;
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

    const isManager = group.manager.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isManager && !isAdmin) {
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
  getGroupById,
  joinGroup,
  approveMember
};
