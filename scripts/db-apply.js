// Runs the SQL files in db/ against a Postgres database (Railway, Supabase, ...).
//
//   DATABASE_URL="postgresql://..." npm run db:migrate   # create the tables
//   DATABASE_URL="postgresql://..." npm run db:seed      # load demo data
//   DATABASE_URL="postgresql://..." npm run db:reset     # drop everything, re-create, re-seed
//   DATABASE_URL="postgresql://..." npm run db:down      # drop everything
//
// Use this instead of the Railway "Data" query box: that box adds its own LIMIT
// to your query, which breaks multi-statement scripts ("syntax error at or near LIMIT").
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = {
  migrate: ['db/migrations/001_init.sql'],
  seed: ['db/seed.sql'],
  down: ['db/migrations/001_init_down.sql'],
  reset: ['db/migrations/001_init_down.sql', 'db/migrations/001_init.sql', 'db/seed.sql'],
};

const command = process.argv[2];
const url = process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;
if (!FILES[command] || !url) {
  console.error(`Usage: DATABASE_URL=postgresql://... node scripts/db-apply.js <${Object.keys(FILES).join('|')}>`);
  if (!url) console.error('DATABASE_URL is not set. On Railway: Postgres service > Variables > DATABASE_PUBLIC_URL.');
  process.exit(1);
}

const host0 = (() => { try { return new URL(url).host; } catch { return null; } })();
if (!host0) {
  console.error('That DATABASE_URL is not a valid URL. It should look like postgresql://user:password@host:port/database');
  process.exit(1);
}
console.log(`Connecting to ${host0} ...`);
if (/\.railway\.internal(:|$)/.test(host0)) {
  console.error(`\nThat is Railway's INTERNAL address. It only works inside Railway, not from your laptop.
In Railway: Postgres service > Settings > Networking > enable "TCP Proxy", then Variables > copy DATABASE_PUBLIC_URL
(host ends in .proxy.rlwy.net). Run:  export DATABASE_URL="<that value>"  and try again.`);
  process.exit(1);
}
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
const sql = postgres(url, { ssl: local ? false : 'prefer', max: 1, onnotice: () => { }, connect_timeout: 20 });

try {
  const host = new URL(url).host;
  for (const file of FILES[command]) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    // Each file wraps itself in begin/commit, so a failure leaves nothing half-applied.
    await sql.unsafe(text);
    console.log(`ok  ${file}  ->  ${host}`);
  }
  const [{ users, classes, sessions }] = await sql`
    select (select count(*) from users)::int users, (select count(*) from classes)::int classes,
           (select count(*) from sessions)::int sessions`.catch(() => [{}]);
  if (users !== undefined) console.log(`Now in the database: ${users} users, ${classes} classes, ${sessions} sessions.`);
} catch (e) {
  console.error(`FAILED: ${e.message}`);
  if (/already exists/.test(e.message)) console.error('The tables already exist. Run db:reset to wipe and start over.');
  if (/duplicate key/.test(e.message)) console.error('The seed data is already loaded. Run db:reset to wipe and start over.');
  process.exitCode = 1;
} finally {
  await sql.end();
}
