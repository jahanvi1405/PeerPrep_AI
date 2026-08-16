import env from './config/env.js';
import app from './app.js';
import { connectDB, disconnectDB } from './config/db.js';

/**
 * Process entry point.
 *
 * Boot order is deliberate: connect to MongoDB FIRST, and only start
 * accepting HTTP traffic once that succeeds. If the DB is unreachable, the
 * process exits immediately with a clear log line instead of starting a
 * server that would accept requests and fail on every single one of them.
 */

let server;

async function start() {
  try {
    await connectDB();

    server = app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`[server] PeerPrep AI API running in ${env.nodeEnv} mode on port ${env.port}`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[server] Failed to start:', err.message);
    process.exit(1);
  }
}

start();

/**
 * Safety nets — without these, a rejected promise or thrown error outside
 * Express's request cycle can leave the process in a broken but still-running
 * state (accepting traffic while actually unusable), which is worse than
 * crashing cleanly and letting the process manager (Docker/PM2) restart it.
 */
process.on('unhandledRejection', (err) => {
  // eslint-disable-next-line no-console
  console.error('[unhandledRejection] Shutting down...', err);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[uncaughtException] Shutting down...', err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  // eslint-disable-next-line no-console
  console.log('[server] SIGTERM received. Shutting down gracefully...');
  if (server) {
    server.close(async () => {
      await disconnectDB();
      // eslint-disable-next-line no-console
      console.log('[server] Process terminated.');
      process.exit(0);
    });
  }
});

export default server;
