/**
 * @file postController.js
 * @description Post CRUD, feed visibility, search filters, and like toggling for the social network API.
 *
 * Purpose:
 *   Handles every HTTP operation on Post documents: create, list, feed, per-user,
 *   per-group, update, delete, and like/unlike. Posts always belong to a Group and
 *   an author (User). This controller is the main place where "who can see what"
 *   is enforced for the home feed and group walls.
 *
 * Responsibilities:
 *   - Create posts only when the requester is a group member, the group manager, or an admin
 *   - Build a personalized feed that respects membership and private-group boundaries
 *   - Apply optional search filters (text, author, group name, date range, image/video)
 *   - Authorize edit/delete via author, group manager, or platform admin roles
 *   - Toggle likes by adding/removing the current user's id from post.likes
 *
 * Connections:
 *   - Models: Post, Group, User
 *   - Imports canViewGroup from groupController to gate private-group post lists
 *   - Used by post routes (typically under /api/posts) after auth middleware sets req.user
 *
 * Key concepts for defense:
 *   - Feed visibility: $or of (own posts | posts in member groups | friends' posts
 *     outside private groups the viewer is not in), combined with $and when filters apply
 *   - MongoDB operators: $in / $nin for id lists, $regex for case-insensitive search,
 *     $exists / $nin for media presence, $gte / $lte for date windows
 *   - Permissions: author vs group manager vs admin (canModifyPost / canDeletePost)
 *   - Mongoose populate: expands author and group ObjectIds into readable fields
 */

const Post = require('../models/Post');
const Group = require('../models/Group');
const User = require('../models/User');
const { canViewGroup } = require('./groupController');

/** Fields returned when populating a post's author reference. */
const authorFields = 'username fullName email profileImageUrl';
/** Fields returned when populating a post's group reference. */
const groupFields = 'name description isPrivate manager';

/**
 * Attaches author and group documents to a Post query via Mongoose populate.
 * Keeps list/detail responses self-contained for the React client without extra round-trips.
 *
 * @param {import('mongoose').Query} query - A Post find/findById query chain
 * @returns {import('mongoose').Query} The same query with populate stages applied
 */
const populatePost = (query) => {
  return query
    .populate('author', authorFields)
    .populate('group', groupFields);
};

/**
 * Builds a MongoDB sort object from request query params.
 * Only createdAt is used as the sort field; sortOrder 'asc' → 1, otherwise descending (-1).
 *
 * @param {object} query - Express req.query (expects sortBy, sortOrder)
 * @returns {object} Sort specifier, e.g. { createdAt: -1 }
 */
const getPostSort = (query) => {
  const sortBy = query.sortBy === 'createdAt' ? 'createdAt' : 'createdAt';
  const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

  return { [sortBy]: sortOrder };
};

/**
 * Translates optional HTTP query-string filters into a MongoDB match document.
 * Used by getFeed, getPostsByGroup, and getGroupPosts so search UX stays consistent.
 *
 * How each filter works:
 *   - text → case-insensitive $regex on content
 *   - author → find Users matching username/fullName ($or + $regex), then post.author $in those ids
 *   - group (only if includeGroup) → find Groups by name $regex, then post.group $in those ids
 *   - fromDate / toDate → createdAt $gte / $lte (toDate includes the full end day via 23:59:59.999)
 *   - hasImage / hasVideo → $exists + $nin for "has media", or $or of empty/null/missing for "no media"
 *
 * When media conditions exist alongside other fields, results are wrapped in $and so every
 * clause must match. A single media-only condition is returned as-is (no unnecessary $and).
 *
 * @param {object} query - Express req.query filter fields
 * @param {object} [options]
 * @param {boolean} [options.includeGroup=false] - Whether to honor the group name filter
 * @returns {Promise<object>} MongoDB filter object (may contain $and)
 */
const buildPostQueryFilter = async (query, options = {}) => {
  const { includeGroup = false } = options;
  const filter = {};
  const andConditions = [];
  const { text, author, group, fromDate, toDate, hasImage, hasVideo } = query;

  // Case-insensitive substring match on post body text
  if (text) {
    filter.content = { $regex: text, $options: 'i' };
  }

  // Resolve author search string → User _ids, then constrain posts with $in
  if (author) {
    const authors = await User.find({
      $or: [
        { username: { $regex: author, $options: 'i' } },
        { fullName: { $regex: author, $options: 'i' } }
      ]
    }).select('_id');

    filter.author = { $in: authors.map((item) => item._id) };
  }

  // Optional group-name filter (feed only); same pattern: name → Group ids → $in
  if (includeGroup && group) {
    const groups = await Group.find({
      name: { $regex: group, $options: 'i' }
    }).select('_id');

    filter.group = { $in: groups.map((item) => item._id) };
  }

  // Inclusive lower bound on createdAt
  if (fromDate) {
    filter.createdAt = filter.createdAt || {};
    filter.createdAt.$gte = new Date(fromDate);
  }

  // Inclusive upper bound: end of the selected calendar day (not midnight-only)
  if (toDate) {
    filter.createdAt = filter.createdAt || {};
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);
    filter.createdAt.$lte = endDate;
  }

  // hasImage=true: field exists and is not empty string or null ($nin)
  // hasImage=false: treat '', null, or missing field as "no image" via $or
  if (hasImage === 'true') {
    andConditions.push({ imageUrl: { $exists: true, $nin: ['', null] } });
  } else if (hasImage === 'false') {
    andConditions.push({
      $or: [
        { imageUrl: '' },
        { imageUrl: null },
        { imageUrl: { $exists: false } }
      ]
    });
  }

  // Same media-presence logic for videoUrl
  if (hasVideo === 'true') {
    andConditions.push({ videoUrl: { $exists: true, $nin: ['', null] } });
  } else if (hasVideo === 'false') {
    andConditions.push({
      $or: [
        { videoUrl: '' },
        { videoUrl: null },
        { videoUrl: { $exists: false } }
      ]
    });
  }

  // Merge scalar filters with media $or/$exists clauses under $and when both exist
  if (andConditions.length > 0) {
    if (Object.keys(filter).length > 0) {
      return { $and: [{ ...filter }, ...andConditions] };
    }

    return andConditions.length === 1 ? andConditions[0] : { $and: andConditions };
  }

  return filter;
};

/**
 * Whether the user may edit a post's content/media.
 * Allowed if: post author, manager of the post's group, or platform admin.
 *
 * @param {object} post - Post document (author is ObjectId)
 * @param {object} user - Authenticated user (req.user)
 * @param {object|null} group - Group document for the post, or null
 * @returns {boolean}
 */
const canModifyPost = (post, user, group) => {
  const isAuthor = post.author.toString() === user._id.toString();
  const isManager = group && group.manager.toString() === user._id.toString();
  const isAdmin = user.role === 'admin';

  return isAuthor || isManager || isAdmin;
};

/**
 * Whether the user may delete a post.
 * Without a group: author or admin only.
 * With a group: author, that group's manager, or admin.
 *
 * @param {object} post - Post document
 * @param {object} user - Authenticated user
 * @param {object|null} group - Group document, or null if the post has no group
 * @returns {boolean}
 */
const canDeletePost = (post, user, group) => {
  const isAuthor = post.author.toString() === user._id.toString();
  const isAdmin = user.role === 'admin';

  if (!group) {
    return isAuthor || isAdmin;
  }

  const isManager = group.manager.toString() === user._id.toString();

  return isAuthor || isManager || isAdmin;
};

/**
 * POST create — publish a new post inside a group.
 * Membership gate: only members, the group manager, or admins may create.
 * Defaults visibility to 'group' and empty strings for optional media URLs.
 *
 * @param {import('express').Request} req - body: group, content, imageUrl?, videoUrl?, visibility?
 * @param {import('express').Response} res
 */
const createPost = async (req, res) => {
  try {
    const { group, content, imageUrl, videoUrl, visibility } = req.body;

    if (!group || !content?.trim()) {
      return res.status(400).json({ message: 'Group and content are required' });
    }

    const existingGroup = await Group.findById(group);

    if (!existingGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Membership check: members array, manager id, or admin role
    const userId = req.user._id.toString();
    const isMember = existingGroup.members.some(
      (memberId) => memberId.toString() === userId
    );
    const isManager = existingGroup.manager.toString() === userId;
    const isAdmin = req.user.role === 'admin';

    if (!isMember && !isManager && !isAdmin) {
      return res.status(403).json({
        message:
          'Only group members, the group manager, or admins can create posts in this group'
      });
    }

    const post = await Post.create({
      author: req.user._id,
      group,
      content: content.trim(),
      imageUrl: imageUrl || '',
      videoUrl: videoUrl || '',
      visibility: visibility || 'group'
    });

    const populatedPost = await populatePost(Post.findById(post._id));

    res.status(201).json(populatedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET all posts (unfiltered admin/debug-style listing), newest first.
 * Does not apply feed visibility rules — callers that need privacy should use getFeed.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getPosts = async (req, res) => {
  try {
    const posts = await populatePost(Post.find().sort({ createdAt: -1 }));

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET personalized home feed for the authenticated user.
 *
 * Visibility ($or — a post appears if ANY branch matches):
 *   1. author is the current user (always see your own posts)
 *   2. group is in memberGroupIds (posts in groups you belong to)
 *   3. author is in currentUser.friends AND group is $nin privateGroupIdsNotMember
 *      → friends' posts are visible unless they live in a private group you are not in
 *
 * Private groups the user is not a member of are collected first so branch 3 can
 * exclude them with $nin. Optional search filters are AND-ed with this permission set.
 *
 * @param {import('express').Request} req - query may include text, author, group, dates, media, sort
 * @param {import('express').Response} res
 */
const getFeed = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);

    // Groups where the user appears in members → always visible in the feed
    const memberGroups = await Group.find({ members: req.user._id }).select('_id');
    const memberGroupIds = memberGroups.map((group) => group._id);

    // Private groups the user does NOT belong to → block friends' posts from those walls
    const privateGroupsNotMember = await Group.find({
      isPrivate: true,
      members: { $ne: req.user._id }
    }).select('_id');

    const privateGroupIdsNotMember = privateGroupsNotMember.map((group) => group._id);

    // Core feed permission: own | member-group | friend (not in blocked private groups)
    const permissionFilter = {
      $or: [
        { author: req.user._id },
        { group: { $in: memberGroupIds } },
        {
          author: { $in: currentUser.friends },
          group: { $nin: privateGroupIdsNotMember }
        }
      ]
    };

    const queryFilter = await buildPostQueryFilter(req.query, { includeGroup: true });
    // Combine visibility with optional search using $and so both must hold
    const finalFilter =
      Object.keys(queryFilter).length > 0
        ? { $and: [permissionFilter, queryFilter] }
        : permissionFilter;

    const posts = await populatePost(
      Post.find(finalFilter).sort(getPostSort(req.query))
    );

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET posts authored by the current user only, newest first.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getMyPosts = async (req, res) => {
  try {
    const posts = await populatePost(
      Post.find({ author: req.user._id }).sort({ createdAt: -1 })
    );

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET posts for a group identified by :groupId.
 * Uses canViewGroup: public groups are open; private groups require member/manager/admin.
 * Optional query filters are $and-ed with { group: groupId }.
 *
 * @param {import('express').Request} req - params.groupId; query filters optional
 * @param {import('express').Response} res
 */
const getPostsByGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Private-group gate shared with groupController
    if (!canViewGroup(group, req.user)) {
      return res.status(403).json({
        message: 'You do not have permission to view posts in this private group'
      });
    }

    const queryFilter = await buildPostQueryFilter(req.query);
    const baseFilter = { group: req.params.groupId };
    const finalFilter =
      Object.keys(queryFilter).length > 0
        ? { $and: [baseFilter, queryFilter] }
        : baseFilter;

    const posts = await populatePost(
      Post.find(finalFilter).sort(getPostSort(req.query))
    );

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET posts for a group identified by :id (alternate route shape).
 * Same privacy and filter behavior as getPostsByGroup; uses group._id in the match.
 *
 * @param {import('express').Request} req - params.id; query filters optional
 * @param {import('express').Response} res
 */
const getGroupPosts = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!canViewGroup(group, req.user)) {
      return res.status(403).json({
        message: 'You do not have permission to view posts in this private group'
      });
    }

    const queryFilter = await buildPostQueryFilter(req.query);
    const baseFilter = { group: group._id };
    const finalFilter =
      Object.keys(queryFilter).length > 0
        ? { $and: [baseFilter, queryFilter] }
        : baseFilter;

    const posts = await populatePost(
      Post.find(finalFilter).sort(getPostSort(req.query))
    );

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET a single post by id with author and group populated.
 *
 * @param {import('express').Request} req - params.id
 * @param {import('express').Response} res
 */
const getPostById = async (req, res) => {
  try {
    const post = await populatePost(Post.findById(req.params.id));

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * PUT/PATCH update — change content and/or media URLs.
 * Authorized via canModifyPost (author, group manager, or admin).
 * Empty trimmed content is rejected; undefined fields are left unchanged.
 *
 * @param {import('express').Request} req - params.id; body: content?, imageUrl?, videoUrl?
 * @param {import('express').Response} res
 */
const updatePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const group = await Group.findById(post.group);

    if (!canModifyPost(post, req.user, group)) {
      return res.status(403).json({ message: 'Not authorized to update this post' });
    }

    const { content, imageUrl, videoUrl } = req.body;

    if (content !== undefined) {
      if (!content.trim()) {
        return res.status(400).json({ message: 'Content cannot be empty' });
      }

      post.content = content;
    }

    if (imageUrl !== undefined) {
      post.imageUrl = imageUrl;
    }

    if (videoUrl !== undefined) {
      post.videoUrl = videoUrl;
    }

    await post.save();

    const updatedPost = await populatePost(Post.findById(post._id));

    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * DELETE a post. Authorized via canDeletePost (author, manager if group exists, or admin).
 *
 * @param {import('express').Request} req - params.id
 * @param {import('express').Response} res
 */
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const group = post.group ? await Group.findById(post.group) : null;

    if (!canDeletePost(post, req.user, group)) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await post.deleteOne();

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * Toggle like: if the current user's id is already in post.likes, remove it (unlike);
 * otherwise push it (like). Likes are stored as an array of User ObjectIds on the post.
 *
 * @param {import('express').Request} req - params.id
 * @param {import('express').Response} res - returns the updated populated post
 */
const toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userId = req.user._id;
    const alreadyLiked = (post.likes || []).some(
      (likeId) => likeId.toString() === userId.toString()
    );

    if (alreadyLiked) {
      // Unlike: filter the user's id out of the likes array
      post.likes = post.likes.filter(
        (likeId) => likeId.toString() !== userId.toString()
      );
    } else {
      // Like: append the user's id
      post.likes.push(userId);
    }

    await post.save();

    const updatedPost = await populatePost(Post.findById(post._id));

    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createPost,
  getPosts,
  getFeed,
  getMyPosts,
  getPostsByGroup,
  getGroupPosts,
  getPostById,
  updatePost,
  deletePost,
  toggleLike
};
