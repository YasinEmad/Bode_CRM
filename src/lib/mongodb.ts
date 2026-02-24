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
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
