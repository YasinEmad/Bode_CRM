require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/bode-crm';

async function reset() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  try {
    console.log('Connecting to', MONGODB_URI.replace(/(mongodb\+srv:\/\/[^:]+):.*@/, '$1:*****@'));
    // Connect
    await mongoose.connect(MONGODB_URI);

    const db = mongoose.connection.db;
    console.log('Connected');

    try {
      await db.dropDatabase();
      console.log('Database dropped successfully');
    } catch (e) {
      console.error('Failed to drop database', e);
    }
  } catch (err) {
    console.error('Connection error:', err.message || err);
    process.exit(1);
  } finally {
    try {
      await mongoose.disconnect();
    } catch (e) {}
    process.exit(0);
  }
}

reset();
