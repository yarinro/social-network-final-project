const getMessages = (req, res) => {
  res.json({ message: 'Get all messages - controller placeholder' });
};

const getMessageById = (req, res) => {
  res.json({ message: `Get message ${req.params.id} - controller placeholder` });
};

const createMessage = (req, res) => {
  res.status(201).json({ message: 'Create message - controller placeholder' });
};

module.exports = {
  getMessages,
  getMessageById,
  createMessage
};
