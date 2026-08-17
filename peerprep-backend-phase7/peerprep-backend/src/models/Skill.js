import mongoose from 'mongoose';

/**
 * The global catalog of skills a user can attach to their profile
 * (Java, React, DSA, System Design, ...). This is a shared, platform-wide
 * list, not per-user data — one Skill document is referenced by many
 * UserSkill records (Phase 8's actual user-to-skill relationship).
 *
 * No create/update/delete API is exposed for this model in Phase 8 — the
 * spec only calls for GET /api/v1/skills (public listing) plus users
 * attaching/detaching from that existing catalog. Populating the catalog
 * itself is handled by src/seed/index.js, not an authenticated write
 * endpoint, since skill taxonomy curation isn't a per-user action.
 */

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Skill name is required'],
      unique: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * Derives slug from name automatically — "Node.js" -> "node-js". Runs on
 * every save where name is new/changed, so the slug can never drift out of
 * sync with the display name it was derived from. This is schema-level
 * data normalization (not a business rule like password hashing), so it
 * stays in the model rather than being pushed out to the service layer.
 */
skillSchema.pre('validate', function deriveSlugFromName(next) {
  if (this.name && (this.isModified('name') || !this.slug)) {
    this.slug = slugify(this.name);
  }
  next();
});

skillSchema.set('toJSON', {
  transform: (doc, ret) => {
    // eslint-disable-next-line no-param-reassign, no-underscore-dangle
    delete ret.__v;
    return ret;
  },
});

const Skill = mongoose.model('Skill', skillSchema);

export default Skill;
