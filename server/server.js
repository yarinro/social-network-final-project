/**
 * File: server.js
 *
 * Purpose:
 * Application entry point. Boots the HTTP server that hosts both the
 * Express REST API and the Socket.IO real-time messaging layer.
 *
 * Main responsibilities:
 * - Loads environment variables from .env (PORT, MONGO_URI, JWT_SECRET).
 * - Connects to MongoDB before accepting traffic.
 * - Creates a Node.js HTTP server wrapping the Express app.
 * - Attaches Socket.IO to that same HTTP server so REST and websockets
 *   share one port (typically 5000).
 * - Starts listening for incoming connections.
 *
 * Connections:
 * - Requires ./src/app (Express application and API routes).
 * - Requires ./src/config/db (Mongoose connection helper).
 * - Requires ./src/socket (Socket.IO initialization for private messages).
 * - The React client (localhost:3000) talks to this process over HTTP and WS.
 *
 * Important concepts:
 * Shared HTTP server for Express + Socket.IO, environment configuration,
 * process startup order (connect DB, then listen), and separation of
 * "app definition" (app.js) from "process bootstrap" (this file).
 */

require('dotenv').config();

const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const initSocket = require('./src/socket');

const PORT = process.env.PORT || 5000;

connectDB();

// Express alone can call app.listen(), but Socket.IO needs a raw Node HTTP
// server instance. Creating http.createServer(app) lets both layers share
// the same TCP port: REST requests go through Express; websocket upgrades
// are handled by Socket.IO on the same server object.
const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
