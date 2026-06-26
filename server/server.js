require('dotenv').config();

const http = require('http');
const app = require('./src/app');
const connectDB = require('./src/config/db');
const initSocket = require('./src/socket');

const PORT = process.env.PORT || 5000;

connectDB();

// HTTP server is needed so Express and Socket.IO share the same port
const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
