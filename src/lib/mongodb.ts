import mongoose from 'mongoose';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bode-crm';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

let cached: { conn: mongoose.Mongoose | null; promise: Promise<mongoose.Mongoose> | null } = {
  conn: null,
  promise: null,
};

let adminEnsured = false;

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
    // Ensure default admin exists once after DB connect
    if (!adminEnsured) {
      adminEnsured = true;
      (async () => {
        try {
          const DEFAULT_ADMIN_USERNAME = 'Bode xRS';
          const DEFAULT_ADMIN_PASSWORD = '636ghjh&76$566';

          const existing = await User.findOne({ username: DEFAULT_ADMIN_USERNAME });
          if (!existing) {
            const hashed = await hashPassword(DEFAULT_ADMIN_PASSWORD);
            await User.create({
              username: DEFAULT_ADMIN_USERNAME,
              password: hashed,
              name: DEFAULT_ADMIN_USERNAME,
              role: 'admin',
            });
            console.log('Default admin created:', DEFAULT_ADMIN_USERNAME);
          } else {
            // ensure role is admin
            if (existing.role !== 'admin') {
              existing.role = 'admin';
              await existing.save();
              console.log('Updated existing user to admin:', DEFAULT_ADMIN_USERNAME);
            }
          }
        } catch (e) {
          console.error('Error ensuring default admin:', e);
        }
      })();
    }
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
