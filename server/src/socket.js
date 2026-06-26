const Message = require('./models/Message');
const User = require('./models/User');

const userFields = 'username fullName email';
// Maps userId -> socket.id so we can send real-time messages to online users
const userSockets = new Map();

const populateMessage = (query) => {
  return query.populate('from', userFields).populate('to', userFields);
};

const initSocket = (server) => {
  const { Server } = require('socket.io');

  const io = new Server(server, {
    cors: {
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    // Client tells the server which user is connected on this socket
    socket.on('registerUser', (userId) => {
      if (!userId) {
        return;
      }

      socket.userId = userId.toString();
      userSockets.set(socket.userId, socket.id);
    });

    // Save message to MongoDB, then push it to sender and receiver in real time
    socket.on('sendMessage', async ({ receiverId, content }, callback) => {
      try {
        const senderId = socket.userId;

        if (!senderId) {
          callback?.({ error: 'User not registered on socket' });
          return;
        }

        if (!receiverId || !content) {
          callback?.({ error: 'Recipient and content are required' });
          return;
        }

        if (receiverId.toString() === senderId) {
          callback?.({ error: 'You cannot send a message to yourself' });
          return;
        }

        const recipient = await User.findById(receiverId);

        if (!recipient) {
          callback?.({ error: 'Recipient not found' });
          return;
        }

        const message = await Message.create({
          from: senderId,
          to: receiverId,
          content,
          isRead: false
        });

        const populatedMessage = await populateMessage(
          Message.findById(message._id)
        );

        socket.emit('receiveMessage', populatedMessage);

        const receiverSocketId = userSockets.get(receiverId.toString());

        if (receiverSocketId) {
          io.to(receiverSocketId).emit('receiveMessage', populatedMessage);
        }

        callback?.({ message: populatedMessage });
      } catch (error) {
        callback?.({ error: error.message });
      }
    });

    socket.on('disconnect', () => {
      if (socket.userId && userSockets.get(socket.userId) === socket.id) {
        userSockets.delete(socket.userId);
      }
    });
  });

  return io;
};

module.exports = initSocket;
