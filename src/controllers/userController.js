const getUsers = (req, res) => {
  res.json({ message: 'Get all users - controller placeholder' });
};

const getUserById = (req, res) => {
  res.json({ message: `Get user ${req.params.id} - controller placeholder` });
};

const createUser = (req, res) => {
  res.status(201).json({ message: 'Create user - controller placeholder' });
};

module.exports = {
  getUsers,
  getUserById,
  createUser
};
