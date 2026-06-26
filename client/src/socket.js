import { io } from 'socket.io-client';

let socket;

// Reuse one socket connection for the whole app
export const getSocket = () => {
  if (!socket) {
    socket = io('http://localhost:5000');
  }

  return socket;
};
