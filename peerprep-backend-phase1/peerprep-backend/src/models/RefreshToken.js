import mongoose from 'mongoose';

/**
 * Persisted refresh-token sessions, keyed primarily by a SHA-256 hash of
 * the raw token — the raw JWT itself is never stored (see authService.js's
 * hashToken()). A leaked database alone is useless without also possessing
 * the original token the client holds, the same reasoning the User model
 * applies to passwordHash.
 *
 * `jti` mirrors the `jti` claim embedded in the refresh token's own JWT
 * payload — stored for cross-checking identity during refresh (defense in
 * depth alongside the hash lookup) and for readability when inspecting
 * the collection. Storing it is not a security concern by itself: a jti is
 * just a random identifier, not a usable credential — only the raw token
 * (hashed here) is sensitive.
 *
 * `replacedBy` links a revoked token to the token that replaced it during
 * rotation, so a compromised-token investigation can walk the rotation
 * chain rather than just seeing "revoked" with no context.
 *
 * `expiresAt` carries a TTL index so MongoDB automatically deletes expired
 * documents — the collection doesn't accumulate dead rows forever.
 */
const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    jti: {
      type: String,
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    replacedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RefreshToken',
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// TTL index: MongoDB removes the document once expiresAt has passed.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

export default RefreshToken;
