require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

async function removeAdmin() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  try {
    console.log('Connecting to database...');
    console.log('URI:', MONGODB_URI.replace(/([^:]+):([^@]+)@/, '$1:****@'));
    
    const conn = await mongoose.connect(MONGODB_URI, { 
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000 
    });
    
    const db = conn.connection.db;
    const username = 'Bode xRS';
    console.log(`Removing user: ${username}`);
    
    const result = await db.collection('users').deleteOne({ username: username });
    
    if (result.deletedCount > 0) {
      console.log(`✓ Successfully removed user: ${username}`);
    } else {
      console.log(`✗ User not found: ${username}`);
    }
    
  } catch (err) {
    console.error('Error:', err.message || err);
    process.exit(1);
  } finally {
    try {
      await mongoose.disconnect();
    } catch (e) {}
    process.exit(0);
  }
}

removeAdmin();
