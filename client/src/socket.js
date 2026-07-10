/**
 * File: socket.js
 *
 * Purpose:
 * Lazy singleton factory for the Socket.IO client used by real-time messaging.
 *
 * Main responsibilities:
 * - Connect once to the backend Socket.IO server (port 5000).
 * - Reuse the same socket instance across the app (Messages page, etc.).
 *
 * Data flow:
 * - getSocket() is called when a page needs live events (registerUser, sendMessage).
 * - Complements REST message APIs: history via Axios, live delivery via this socket.
 *
 * Important concepts:
 * Socket.IO client, singleton pattern (one connection per browser tab/app),
 * and separation of HTTP (api.js) from websocket transport.
 */

import { io } from 'socket.io-client';

let socket;

/**
 * Returns the shared Socket.IO client, creating it on first use.
 *
 * Connecting lazily avoids opening a websocket before the user needs messages.
 *
 * @returns {import('socket.io-client').Socket}
 */
export const getSocket = () => {
  if (!socket) {
    socket = io('http://localhost:5000');
  }

  return socket;
};
