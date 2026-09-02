import mongoose from 'mongoose';

import { env } from '../env';

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cached = (global as any).mongoose;

if (!cached) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    console.log('MongoDB: Using cached connection');
    return cached.conn;
  }

  if (!cached.promise) {
    console.log('MongoDB: Establishing new connection...');
    const opts = {
      bufferCommands: false,
    };

    // Read at call time, not module scope. `next build` imports this module
    // while prerendering, where no runtime secrets exist -- resolving the URI
    // up here would fail the production build (and the Docker image) instead
    // of a genuinely misconfigured deploy.
    cached.promise = mongoose
      .connect(env.MONGO_URI, opts)
      .then((mongoose) => {
        console.log('MongoDB: Application successfully connected to the database.');
        return mongoose;
      })
      .catch((error) => {
        console.error('MongoDB: Error connecting to database', error);
        throw error;
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

export default dbConnect;
