/**
 * File: db.js
 *
 * Purpose:
 * Establishes the Mongoose connection to MongoDB Atlas (or any MongoDB URI
 * provided in MONGO_URI).
 *
 * Main responsibilities:
 * - Reads MONGO_URI from the environment and fails fast if it is missing.
 * - Sets public DNS resolvers so SRV lookups for mongodb+srv:// succeed
 *   on networks where the default DNS fails.
 * - Connects Mongoose and logs success or exits the process on failure.
 *
 * Connections:
 * - Called once from server.js at startup.
 * - After connect, all models (User, Group, Post, Message) share this pool.
 * - Also used conceptually by scripts/seed.js and scripts/testMongo.js,
 *   which open their own connections with the same URI pattern.
 *
 * Important concepts:
 * Environment-based configuration, mongodb+srv DNS (SRV records),
 * fail-fast startup, and a single shared Mongoose connection for the app.
 */

const mongoose = require('mongoose');
const dns = require('dns');

/**
 * Connects Mongoose to the database URI in process.env.MONGO_URI.
 *
 * Side effects:
 * - May call process.exit(1) if the URI is missing or the connection fails,
 *   because the API cannot operate without a database.
 *
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri) {
      console.error('MONGO_URI is missing. Please add it to your .env file.');
      process.exit(1);
    }

    // Atlas connection strings use mongodb+srv:// which requires a DNS SRV
    // lookup. Some local DNS setups refuse those queries; forcing Google/Cloudflare
    // resolvers avoids "querySrv ECONNREFUSED" during development.
    dns.setServers(['8.8.8.8', '1.1.1.1']);

    await mongoose.connect(mongoUri);

    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
