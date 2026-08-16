import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { NODE_ENV } from '../constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root regardless of where the process is started from.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Env vars required in every environment for the server to boot at all.
 * Kept intentionally small at this phase (Phase 1) — DB, JWT, OAuth, Gemini and
 * Cloudinary vars are validated by their own config modules when those phases
 * wire them up, so a missing GEMINI_API_KEY doesn't block booting the bare server.
 */
const REQUIRED_IN_ALL_ENVS = ['PORT', 'NODE_ENV'];

function assertRequiredEnvVars() {
  const missing = REQUIRED_IN_ALL_ENVS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    // Fail fast and loud at boot — never let the server start half-configured
    // and fail mysteriously on the first request instead.
    // eslint-disable-next-line no-console
    console.error(`[env] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
}

assertRequiredEnvVars();

const env = {
  nodeEnv: process.env.NODE_ENV || NODE_ENV.DEVELOPMENT,
  port: Number(process.env.PORT) || 5000,
  apiVersion: process.env.API_VERSION || 'v1',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',

  mongoUri: process.env.MONGO_URI,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 100,
  },

  isProduction: (process.env.NODE_ENV || NODE_ENV.DEVELOPMENT) === NODE_ENV.PRODUCTION,
  isTest: (process.env.NODE_ENV || NODE_ENV.DEVELOPMENT) === NODE_ENV.TEST,
};

export default env;
