/**
 * @file groupController.js
 * @description Group lifecycle, membership, privacy, and join-approval for the social network API.
 *
 * Purpose:
 *   Manages Group documents: create, list, search, detail, update, delete, join,
 *   and approve pending members. Groups are the containers for posts; privacy
 *   (isPrivate) and membership drive who can view a group and its wall.
 *
 * Responsibilities:
 *   - Create groups with the requester as manager and first member
 *   - Enforce private-group visibility (members, manager, or admin only)
 *   - Restrict update/delete/approve to the group manager or platform admin
 *   - Public join = immediate membership; private join = pendingMembers queue
 *   - On delete: remove related posts and $pull the group id from users' groups arrays
 *   - Export canViewGroup / canManageGroup for reuse (e.g. postController)
 *
 * Connections:
 *   - Models: Group, Post, User
 *   - Consumed by group routes and imported by postController for private-wall checks
 *   - Auth middleware supplies req.user (role, _id) for permission decisions
 *
 * Key concepts for defense:
 *   - Private vs public: canViewGroup short-circuits true for public; private needs membership
 *   - Manager vs admin: canManageGroup treats either as authorized for sensitive actions
 *   - Join flow: pendingMembers for private groups until approveMember moves user into members
 *   - MongoDB: $or for "my groups", $in for search results, $regex for name/manager search,
 *     $pull when cascading group removal from User.groups
 */

const Group = require('../models/Group');
const Post = require('../models/Post');
const User = require('../models/User');

/** User fields exposed when populating manager, members, and pendingMembers. */
const userFields = 'username fullName profileImageUrl';

/**
 * Populates manager and members (and optionally pendingMembers) on a Group query.
 * Pending list is sensitive: only include it when the caller is allowed to manage the group.
 *
 * @param {import('mongoose').Query} query - Group find/findById query
 * @param {boolean} [includePending=true] - Whether to populate pendingMembers
 * @returns {import('mongoose').Query}
 */
const populateGroup = (query, includePending = true) => {
  query.populate('manager', userFields).populate('members', userFields);

  if (includePending) {
    query.populate('pendingMembers', userFields);
  }

  return query;
};

/**
 * Whether the user may manage the group (update, delete, approve join requests).
 * True if the user is the group's manager or has role 'admin'.
 * Supports both populated manager ({ _id }) and raw ObjectId.
 *
 * @param {object} group - Group document
 * @param {object} user - Authenticated user
 * @returns {boolean}
 */
const canManageGroup = (group, user) => {
  const managerId = group.manager._id || group.manager;
  const isManager = managerId.toString() === user._id.toString();
  const isAdmin = user.role === 'admin';

  return isManager || isAdmin;
};

/**
 * Whether the user may view group details (and, via postController, that group's posts).
 * Public groups (isPrivate === false): anyone authenticated who reaches this check may view.
 * Private groups: only members, the manager, or an admin.
 * Member/manager ids may be populated documents or raw ObjectIds — both are normalized with ._id || id.
 *
 * @param {object} group - Group document
 * @param {object} user - Authenticated user
 * @returns {boolean}
 */
const canViewGroup = (group, user) => {
  if (!group.isPrivate) {
    return true;
  }

  const userId = user._id.toString();
  const managerId = (group.manager._id || group.manager).toString();
  const isMember = group.members.some(
    (memberId) => (memberId._id || memberId).toString() === userId
  );

  return isMember || managerId === userId || user.role === 'admin';
};

/**
 * Shapes a group response for getGroupById.
 * Always includes core fields; pendingMembers only when includePending is true
 * (manager/admin), so ordinary members never see the join-request queue.
 *
 * @param {object} group - Populated group document
 * @param {boolean} includePending - Whether to attach pendingMembers
 * @returns {object} Plain response object
 */
const formatGroupDetails = (group, includePending) => {
  const response = {
    _id: group._id,
    name: group.name,
    description: group.description,
    isPrivate: group.isPrivate,
    manager: group.manager,
    members: group.members,
    createdAt: group.createdAt
  };

  if (includePending) {
    response.pendingMembers = group.pendingMembers;
  }

  return response;
};

/**
 * For groups the current user manages (or if user is admin), re-fetch with full populate
 * including pendingMembers so managers see join requests in list endpoints.
 * Non-manager groups are returned unchanged.
 *
 * @param {Array} groupsList - Array of group documents
 * @param {object|null} user - Authenticated user, or null to skip enrichment
 * @returns {Promise<Array>} Possibly re-populated groups
 */
const enrichManagerGroups = async (groupsList, user) => {
  if (!user) {
    return groupsList;
  }

  return Promise.all(
    groupsList.map(async (group) => {
      const managerId = group.manager._id || group.manager;

      // Skip enrichment unless this user is the manager or a platform admin
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

/**
 * POST create — new group owned by the current user.
 * Creator becomes manager and is added to members; pendingMembers starts empty.
 * isPrivate defaults to false (public) when omitted.
 *
 * @param {import('express').Request} req - body: name, description?, isPrivate?
 * @param {import('express').Response} res
 */
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

/**
 * GET all groups with manager/members populated (no pendingMembers).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getGroups = async (req, res) => {
  try {
    const groups = await populateGroup(Group.find(), false);

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET groups where the logged-in user is manager OR member ($or).
 * Sorted newest first; managers/admins then get pendingMembers via enrichManagerGroups.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getMyGroups = async (req, res) => {
  try {
    const userId = req.user._id;

    // $or: match if user is listed as manager or appears in members
    const groups = await populateGroup(
      Group.find({
        $or: [{ manager: userId }, { members: userId }]
      }).sort({ createdAt: -1 }),
      false
    );

    const enrichedGroups = await enrichManagerGroups(groups, req.user);

    res.json(enrichedGroups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET search/filter groups by optional query params.
 *
 * Filters:
 *   - name → case-insensitive $regex on group name
 *   - isPrivate → exact boolean when 'true' / 'false'
 *   - manager → find Users by username/fullName ($or + $regex), then manager $in those ids
 *   - minMembers → in-memory filter on members.length (not a Mongo aggregation)
 *
 * After filtering, groups are re-queried by _id $in for populate + sort, then enriched
 * so managers see pendingMembers.
 *
 * @param {import('express').Request} req - query: name?, isPrivate?, manager?, minMembers?
 * @param {import('express').Response} res
 */
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

    // Resolve manager search text to User ids, then constrain with $in
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

    // Client-side size filter after the DB query
    if (minMembers) {
      const minimum = Number(minMembers);

      if (!Number.isNaN(minimum)) {
        groups = groups.filter((group) => group.members.length >= minimum);
      }
    }

    // Re-fetch matching ids with populate and consistent createdAt sort
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

/**
 * GET one group by id. Private groups require canViewGroup.
 * pendingMembers are populated and returned only when canManageGroup is true.
 *
 * @param {import('express').Request} req - params.id
 * @param {import('express').Response} res
 */
const getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id).populate(
      'manager',
      userFields
    ).populate('members', userFields);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!canViewGroup(group, req.user)) {
      return res.status(403).json({
        message: 'You do not have permission to view this private group'
      });
    }

    // Only manager/admin see the join-request queue
    const includePending = canManageGroup(group, req.user);

    if (includePending) {
      await group.populate('pendingMembers', userFields);
    }

    res.json(formatGroupDetails(group, includePending));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Update group name, description, and/or isPrivate.
 * Restricted to manager or admin (canManageGroup). Empty name is rejected.
 *
 * @param {import('express').Request} req - params.id; body: name?, description?, isPrivate?
 * @param {import('express').Response} res
 */
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

/**
 * Delete a group (manager or admin only), with cascade cleanup:
 *   1. Post.deleteMany for all posts in this group
 *   2. User.updateMany with $pull to remove this group id from every user's groups array
 *   3. Delete the group document itself
 *
 * $pull removes matching values from an array field without deleting the whole document.
 *
 * @param {import('express').Request} req - params.id
 * @param {import('express').Response} res
 */
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
    // $pull: strip this group ObjectId from User.groups wherever it appears
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

/**
 * Join a group (or request to join if private).
 * - Already a member / already pending → 400
 * - Private: push user into pendingMembers; manager must approve later
 * - Public: push user into members immediately
 *
 * @param {import('express').Request} req - params.id
 * @param {import('express').Response} res
 */
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

    // Private groups: queue for manager approval instead of joining immediately
    if (group.isPrivate) {
      group.pendingMembers.push(req.user._id);
      await group.save();

      const updatedGroup = await populateGroup(Group.findById(group._id));

      return res.json({
        message: 'Join request sent. Waiting for manager approval.',
        group: updatedGroup
      });
    }

    // Public groups: membership is granted at once
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

/**
 * Approve a pending join request (manager or admin only).
 * Removes userId from pendingMembers and pushes it onto members.
 *
 * @param {import('express').Request} req - params.id (group), params.userId (applicant)
 * @param {import('express').Response} res
 */
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

    // Move from pending queue → active members
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
  getMyGroups,
  searchGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  joinGroup,
  approveMember,
  canViewGroup,
  canManageGroup
};
