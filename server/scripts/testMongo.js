require('dotenv').config();

const dns = require('dns');
const mongoose = require('mongoose');

dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoUri = process.env.MONGO_URI;

const hidePassword = (uri) => {
  if (!uri) {
    return '';
  }

  return uri.replace(/(mongodb\+srv:\/\/[^:]+:)([^@]+)(@)/, '$1***$3');
};

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
    await mongoose.disconnect();
  }
};

testMongoConnection();
