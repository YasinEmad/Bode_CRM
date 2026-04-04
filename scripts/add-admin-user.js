require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/bode-crm';

async function addAdmin() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  try {
    console.log('Connecting to', MONGODB_URI.replace(/(mongodb\+srv:\/\/[^:]+):.*@/, '$1:*****@'));
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to database');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    const username = 'bode';
    const password = 'nh65G@44#';
    const name = 'Admin Bode';

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ username });
    if (existingUser) {
      console.log(`✗ User '${username}' already exists`);
      process.exit(1);
    }

    // Hash the password
    const SALT_ROUNDS = 10;
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create admin user
    const adminUser = {
      username,
      password: hashedPassword,
      name,
      role: 'admin',
      email: `${username}@bode.com`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await usersCollection.insertOne(adminUser);

    console.log(`✓ Admin user created successfully`);
    console.log(`  Username: ${username}`);
    console.log(`  Name: ${name}`);
    console.log(`  Role: admin`);
    console.log(`  ID: ${result.insertedId}`);

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

addAdmin();
