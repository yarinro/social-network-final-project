/**
 * File: testMongo.js
 *
 * Purpose:
 * Standalone diagnostic script that verifies MONGO_URI and attempts a
 * one-shot Mongoose connection. Used when debugging Atlas / DNS / credential
 * problems without starting the full Express server.
 *
 * Main responsibilities:
 * - Confirm MONGO_URI exists and print a password-redacted form of it.
 * - Flag common misconfigurations (spaces, placeholder PASSWORD text).
 * - Connect, report success or detailed driver errors, then disconnect.
 *
 * Connections:
 * - Run manually (for example: node scripts/testMongo.js) from the server folder.
 * - Uses the same MONGO_URI as server/src/config/db.js and scripts/seed.js.
 * - Does not start Express, Socket.IO, or seed data.
 *
 * Important concepts:
 * mongodb+srv DNS, sanitizing secrets in logs, try/finally disconnect,
 * and isolating connection failures from application logic.
 */

require('dotenv').config();

const dns = require('dns');
const mongoose = require('mongoose');

// Same DNS workaround as db.js / seed.js for SRV lookups on restrictive networks.
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoUri = process.env.MONGO_URI;

/**
 * Returns a copy of the Mongo URI with the password segment replaced by ***.
 * Prevents accidental secret leakage when printing connection diagnostics.
 *
 * @param {string} uri - Full MongoDB connection string.
 * @returns {string} Redacted URI, or empty string if uri is falsy.
 */
const hidePassword = (uri) => {
  if (!uri) {
    return '';
  }

  return uri.replace(/(mongodb\+srv:\/\/[^:]+:)([^@]+)(@)/, '$1***$3');
};

/**
 * Prints per-server error details from a MongoDB driver topology error, if present.
 * Helps distinguish DNS failures from authentication or network timeouts.
 *
 * @param {Error} error - Error thrown by mongoose.connect.
 */
const printServerErrors = (error) => {
  const servers = error.reason && error.reason.servers;

  if (!servers) {
    return;
  }

  servers.forEach((server, address) => {
    console.log('---');
    console.log(`address: ${address}`);
    console.log(`server.type: ${server.type}`);

    if (server.error) {
      console.log(`server.error.name: ${server.error.name}`);
      console.log(`server.error.message: ${server.error.message}`);
      console.log(`server.error.code: ${server.error.code || 'none'}`);
      console.log(`server.error.cause: ${server.error.cause || 'none'}`);
    } else {
      console.log('server.error: none');
    }
  });
};

/**
 * Runs the connection test: validate env, connect, log outcome, always disconnect.
 *
 * Side effects: writes to console; may set process.exitCode = 1 on failure;
 * exits with code 1 immediately if MONGO_URI is missing.
 *
 * @returns {Promise<void>}
 */
const testMongoConnection = async () => {
  console.log(`MONGO_URI exists: ${Boolean(mongoUri)}`);

  if (!mongoUri) {
    console.error('MONGO_URI is missing. Please add it to your .env file.');
    process.exit(1);
  }

  console.log(`Sanitized MONGO_URI: ${hidePassword(mongoUri)}`);
  console.log(`Starts with mongodb+srv://: ${mongoUri.startsWith('mongodb+srv://')}`);
  console.log(`Contains spaces: ${/\s/.test(mongoUri)}`);
  console.log(`Contains <db_password>: ${mongoUri.includes('<db_password>')}`);
  console.log(`Contains PASSWORD: ${mongoUri.toUpperCase().includes('PASSWORD')}`);

  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB test connection successful');
  } catch (error) {
    console.error('MongoDB test connection failed');
    console.error(`error.name: ${error.name}`);
    console.error(`error.message: ${error.message}`);
    printServerErrors(error);
    process.exitCode = 1;
  } finally {
    // Always close the connection so the Node process can exit cleanly
    // whether the test succeeded or failed.
    await mongoose.disconnect();
  }
};

testMongoConnection();
