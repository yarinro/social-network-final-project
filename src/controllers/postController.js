const getPosts = (req, res) => {
  res.json({ message: 'Get all posts - controller placeholder' });
};

const getPostById = (req, res) => {
  res.json({ message: `Get post ${req.params.id} - controller placeholder` });
};

const createPost = (req, res) => {
  res.status(201).json({ message: 'Create post - controller placeholder' });
};

module.exports = {
  getPosts,
  getPostById,
  createPost
};
