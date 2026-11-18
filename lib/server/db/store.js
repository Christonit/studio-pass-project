// PLACEHOLDER DATA STORE ("dummy database")
// ---------------------------------------------------------------------------
// Every table lives in memory and is written to data/db.json after each
// change, so data survives restarts. Users are keyed by email: the email is
// the user's primary key, and everything a user owns (bookings, credit
// transactions, proposals, classes they teach) points back to it.
//
// The data is kept on globalThis so all Next.js API routes share one copy,
// even when dev mode reloads modules.
// ---------------------------------------------------------------------------
import fs from 'node:fs';
import path from 'node:path';
import { buildSeed } from './seed.js';

const DATA_FILE = process.env.STUDIOPASS_DATA_FILE ?? path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', 'db.json');
const PERSIST = process.env.NODE_ENV !== 'test' && process.env.STUDIOPASS_PERSIST !== '0';

const state = (globalThis.__studiopassStore ??= { db: null });

function load() {
  if (PERSIST && fs.existsSync(/*turbopackIgnore: true*/ DATA_FILE)) {
    state.db = JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ DATA_FILE, 'utf8'));
  } else {
    state.db = buildSeed();
    save();
  }
  return state.db;
}

export function getDb() {
  return state.db ?? load();
}

export function save() {
  if (!PERSIST || !state.db) return;
  fs.mkdirSync(/*turbopackIgnore: true*/ path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(/*turbopackIgnore: true*/ tmp, JSON.stringify(state.db, null, 2));
  fs.renameSync(/*turbopackIgnore: true*/ tmp, DATA_FILE);
}

/** Throw away all data and re-create the placeholder seed. */
export function resetDb(now) {
  state.db = buildSeed(now);
  save();
  return state.db;
}

export function nextId(table) {
  const d = getDb();
  d.seq[table] = (d.seq[table] ?? 0) + 1;
  return d.seq[table];
}

/** Insert into a table with a numeric id (everything except users). */
export function insert(table, row) {
  const record = { id: nextId(table), ...row };
  getDb()[table].push(record);
  return record;
}

export function byId(table, id) {
  const n = Number(id);
  return getDb()[table].find((r) => r.id === n) ?? null;
}

export function userByEmail(email) {
  const e = String(email ?? '').trim().toLowerCase();
  return e ? (getDb().users.find((u) => u.email === e) ?? null) : null;
}

export const DATA_PATH = DATA_FILE;
