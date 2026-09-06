import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  // We do not throw immediately during build time if env is not loaded,
  // but will throw on first database query if still missing.
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri === 'xxxxx') {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;

    // Drop the stale email_1 unique index left over from a previous schema.
    // It does not exist in our User model, but causes E11000 on every registration
    // because every new user has email=null which violates the unique constraint.
    try {
      await cached.conn.connection.db
        ?.collection('users')
        .dropIndex('email_1');
      console.log('[DB] Dropped stale email_1 index from users collection.');
    } catch {
      // Index doesn't exist or already dropped — that's fine, ignore silently.
    }
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
