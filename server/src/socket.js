/**
 * File: socket.js
 *
 * Purpose:
 * Initializes Socket.IO on the shared HTTP server for real-time private messaging.
 *
 * Main responsibilities:
 * - Accept websocket connections from the React client.
 * - Map authenticated-ish user ids to socket ids in memory (registerUser).
 * - Persist each message to MongoDB, then emit receiveMessage to sender/receiver.
 * - Clean up the in-memory map on disconnect.
 *
 * Connections:
 * - Called from server.js with the http.Server instance.
 * - Uses Message and User models (same documents as messageController REST APIs).
 * - Complements REST message routes: history via HTTP, live delivery via sockets.
 *
 * Important concepts:
 * REST vs Socket.IO events, in-memory userSockets Map, save-then-emit ordering,
 * acknowledgement callbacks, disconnect cleanup, and the limitation that the
 * Map is lost on server restart (users must registerUser again).
 */

const Message = require('./models/Message');
const User = require('./models/User');

const userFields = 'username fullName email';

// In-memory routing table: userId string -> current socket.id.
// Unlike MongoDB, this Map lives only in this Node process. After a restart
// every client must call registerUser again or they will not receive pushes.
const userSockets = new Map();

/**
 * Populates from/to on a Message query with public user fields only.
 *
 * @param {import('mongoose').Query} query - Message find/findById query.
 * @returns {import('mongoose').Query} Query with populate chained.
 */
const populateMessage = (query) => {
  return query.populate('from', userFields).populate('to', userFields);
};

/**
 * Attaches Socket.IO to the given HTTP server and registers event handlers.
 *
 * @param {import('http').Server} server - Shared with Express (see server.js).
 * @returns {import('socket.io').Server} The Socket.IO server instance.
 */
const initSocket = (server) => {
  const { Server } = require('socket.io');

  const io = new Server(server, {
    cors: {
      // Match the CRA dev server origin so browser websocket handshakes succeed.
      origin: 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    // Client must declare which user owns this socket before sending messages.
    // This project stores userId from the client; production apps often verify JWT here too.
    socket.on('registerUser', (userId) => {
      if (!userId) {
        return;
      }

      socket.userId = userId.toString();
      userSockets.set(socket.userId, socket.id);
    });

    // Real-time send path: validate → save Message → emit to both parties → ack.
    // Saving first guarantees the REST conversation APIs see the same history.
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

        // Echo to sender so their UI updates even if they do not optimistically render.
        socket.emit('receiveMessage', populatedMessage);

        const receiverSocketId = userSockets.get(receiverId.toString());

        // If the recipient is offline, the message is still in MongoDB for later REST fetch.
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('receiveMessage', populatedMessage);
        }

        // Optional ack lets the client confirm success or show the error string.
        callback?.({ message: populatedMessage });
      } catch (error) {
        callback?.({ error: error.message });
      }
    });

    socket.on('disconnect', () => {
      // Only delete if this socket is still the mapped one for that user
      // (avoids removing a newer tab's socket if the user reconnected).
      if (socket.userId && userSockets.get(socket.userId) === socket.id) {
        userSockets.delete(socket.userId);
      }
    });
  });

  return io;
};

module.exports = initSocket;
