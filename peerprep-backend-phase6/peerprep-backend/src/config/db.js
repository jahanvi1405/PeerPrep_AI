import mongoose from 'mongoose';
import env from './env.js';

/**
 * MongoDB connection module.
 *
 * Works with MongoDB Atlas out of the box because Atlas connection strings
 * are just standard `mongodb+srv://` URIs — nothing Atlas-specific needs to
 * be hardcoded here. Whatever MONGO_URI is set to (local, Atlas, Docker
 * container) is what mongoose connects to.
 */

// Mongoose 8 no longer needs useNewUrlParser/useUnifiedTopology — those became
// default behavior years ago and passing them now just triggers deprecation
// warnings, so they're intentionally omitted.
const MONGOOSE_OPTIONS = {
  // Fail fast if the server can't be found instead of hanging indefinitely —
  // 10s is generous enough for Atlas cold starts but still bounded.
  serverSelectionTimeoutMS: 10000,
};

let isConnected = false;

/**
 * Connects to MongoDB. Call once, at process startup, before app.listen().
 * Throws on failure so the caller (index.js) can decide what "can't reach the
 * database" means for the process (exit, in this app's case) — this module
 * itself never calls process.exit, keeping it testable in isolation.
 */
export async function connectDB() {
  if (isConnected) {
    // Guards against accidentally calling connectDB() twice (e.g. in tests
    // that import index.js multiple times) — reuses the existing connection
    // instead of opening a second one.
    return mongoose.connection;
  }

  if (!env.mongoUri) {
    throw new Error('MONGO_URI is not set. Add it to your .env file.');
  }

  mongoose.connection.on('connected', () => {
    // eslint-disable-next-line no-console
    console.log(`[db] Mongoose connected → ${mongoose.connection.name}`);
  });

  mongoose.connection.on('error', (err) => {
    // Fires on errors that happen *after* the initial connection succeeded —
    // e.g. the network drops mid-session. Logged here so it's visible even
    // though nothing in the request cycle triggered it.
    // eslint-disable-next-line no-console
    console.error('[db] Mongoose connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    // eslint-disable-next-line no-console
    console.warn('[db] Mongoose disconnected');
    isConnected = false;
  });

  try {
    await mongoose.connect(env.mongoUri, MONGOOSE_OPTIONS);
    isConnected = true;
    return mongoose.connection;
  } catch (err) {
    // This is the initial-connection failure path (bad URI, wrong password,
    // IP not whitelisted on Atlas, cluster unreachable). Re-thrown so
    // index.js can log it clearly and exit — starting the HTTP server with
    // no working database would just mean every request fails at runtime
    // instead of failing once, loudly, at boot.
    // eslint-disable-next-line no-console
    console.error('[db] Initial MongoDB connection failed:', err.message);
    throw err;
  }
}

/**
 * Closes the connection gracefully. Used on SIGTERM/SIGINT so in-flight
 * queries aren't cut off mid-write during a deploy or container restart.
 */
export async function disconnectDB() {
  if (!isConnected) return;
  await mongoose.connection.close();
  isConnected = false;
  // eslint-disable-next-line no-console
  console.log('[db] Mongoose connection closed');
}

export default { connectDB, disconnectDB };
