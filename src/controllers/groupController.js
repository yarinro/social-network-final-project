const getGroups = (req, res) => {
  res.json({ message: 'Get all groups - controller placeholder' });
};

const getGroupById = (req, res) => {
  res.json({ message: `Get group ${req.params.id} - controller placeholder` });
};

const createGroup = (req, res) => {
  res.status(201).json({ message: 'Create group - controller placeholder' });
};

module.exports = {
  getGroups,
  getGroupById,
  createGroup
};
