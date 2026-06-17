const Post = require('../models/Post');
const Group = require('../models/Group');

const authorFields = 'username fullName email';
const groupFields = 'name description isPrivate';

const populatePost = (query) => {
  return query
    .populate('author', authorFields)
    .populate('group', groupFields);
};

const createPost = async (req, res) => {
  try {
    const { group, content, imageUrl, videoUrl, visibility } = req.body;

    if (!group || !content) {
      return res.status(400).json({ message: 'Group and content are required' });
    }

    const existingGroup = await Group.findById(group);

    if (!existingGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const isMember = existingGroup.members.some(
      (memberId) => memberId.toString() === req.user._id.toString()
    );

    if (!isMember) {
      return res.status(403).json({ message: 'Only group members can create posts in this group' });
    }

    const post = await Post.create({
      author: req.user._id,
      group,
      content,
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

const getPosts = async (req, res) => {
  try {
    const posts = await populatePost(Post.find().sort({ createdAt: -1 }));

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPostsByGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const posts = await populatePost(
      Post.find({ group: req.params.groupId }).sort({ createdAt: -1 })
    );

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const group = await Group.findById(post.group);

    const isAuthor = post.author.toString() === req.user._id.toString();
    const isManager = group && group.manager.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isAuthor && !isManager && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await post.deleteOne();

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createPost,
  getPosts,
  getPostsByGroup,
  getPostById,
  deletePost
};
