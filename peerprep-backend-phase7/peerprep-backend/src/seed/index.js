import { connectDB, disconnectDB } from '../config/db.js';
import Skill from '../models/Skill.js';

/**
 * Seeds the global Skill catalog. Run with `npm run seed`.
 *
 * This starter list exists so GET /api/{apiVersion}/skills has something
 * to return and Phase 8 is actually testable end-to-end — it is explicitly
 * NOT meant to be the complete/final skill taxonomy for the platform. Safe
 * to re-run: each skill is upserted by name, so running this repeatedly
 * never creates duplicates (the Skill.name unique index would reject a
 * true duplicate insert anyway, but upsert avoids even attempting one).
 */
const STARTER_SKILLS = [
  'Java',
  'JavaScript',
  'TypeScript',
  'Python',
  'React',
  'Node.js',
  'Express',
  'MongoDB',
  'SQL',
  'DSA',
  'System Design',
  'HTML',
  'CSS',
  'Git',
  'Docker',
];

async function run() {
  await connectDB();

  const results = await Promise.all(
    STARTER_SKILLS.map((name) => Skill.findOneAndUpdate(
      { name },
      { $setOnInsert: { name } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )),
  );

  // eslint-disable-next-line no-console
  console.log(`[seed] Skill catalog ready — ${results.length} skills present.`);

  await disconnectDB();
  process.exit(0);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] Failed to seed skills:', err.message);
  process.exit(1);
});
