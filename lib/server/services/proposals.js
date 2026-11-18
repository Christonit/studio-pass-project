// Instructor class proposals and the admin review flow.
import { getDb, insert, byId, save } from '../db/store.js';
import { clock, DISCIPLINES, LEVELS, RULES } from '../config.js';
import { badRequest, conflict, notFound } from '../errors.js';
import * as v from '../validate.js';
import { presentProposal } from './present.js';

export function parseClassFields(body, { partial = false } = {}) {
  const out = {};
  const has = (k) => !partial || body[k] !== undefined;
  if (has('title')) out.title = v.str(body.title, 'Title', { min: 3, max: 80 });
  if (has('discipline')) out.discipline = v.oneOf(body.discipline, 'Discipline', DISCIPLINES);
  if (has('level')) out.level = v.oneOf(body.level, 'Level', LEVELS);
  if (has('description')) out.description = v.str(body.description, 'Description', { optional: true, max: 500 });
  if (has('location_id')) {
    out.location_id = v.int(body.location_id, 'Location');
    if (!byId('locations', out.location_id)) throw badRequest('Location does not exist.');
  }
  if (has('duration_min')) out.duration_min = v.int(body.duration_min, 'Duration', { min: 15, max: 180 });
  if (has('capacity')) out.capacity = v.int(body.capacity, 'Capacity', { min: 1, max: RULES.maxCapacity });
  if (has('credit_cost')) out.credit_cost = v.int(body.credit_cost, 'Credit cost', { min: 1, max: RULES.maxCredits });
  return out;
}

export async function createProposal(instructor, body) {
  const fields = parseClassFields(body);
  const proposal = insert('proposals', {
    instructor_email: instructor.email,
    ...fields,
    first_session_at: v.futureDate(body.first_session_at, 'First session'),
    weekly_repeats: v.int(body.weekly_repeats ?? 1, 'Weekly repeats', { min: 1, max: RULES.maxWeeklyRepeats }),
    status: 'pending',
    admin_note: null,
    reviewed_by: null,
    reviewed_at: null,
    class_id: null,
    created_at: clock.now().toISOString(),
  });
  save();
  return presentProposal(proposal);
}

export async function listProposals({ status, instructorEmail } = {}) {
  return getDb()
    .proposals.filter((p) => (!status || p.status === status) && (!instructorEmail || p.instructor_email === instructorEmail))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(presentProposal);
}

function pending(id) {
  const p = byId('proposals', id);
  if (!p) throw notFound('Proposal');
  if (p.status !== 'pending') throw conflict(`This proposal was already ${p.status}.`);
  return p;
}

/** Approving creates the class plus one session per week (skipping any already in the past). */
export async function approveProposal(admin, id, { note } = {}) {
  const p = pending(id);
  const now = clock.now();
  const cls = insert('classes', {
    title: p.title,
    discipline: p.discipline,
    level: p.level,
    description: p.description,
    instructor_email: p.instructor_email,
    location_id: p.location_id,
    duration_min: p.duration_min,
    capacity: p.capacity,
    credit_cost: p.credit_cost,
    status: 'active',
    proposal_id: p.id,
    created_by: admin.email,
    created_at: now.toISOString(),
  });
  const first = new Date(p.first_session_at);
  let created = 0;
  for (let i = 0; i < p.weekly_repeats; i++) {
    const start = new Date(first.getTime() + i * 7 * 86400_000);
    if (start <= now) continue;
    insert('sessions', {
      class_id: cls.id,
      starts_at: start.toISOString(),
      capacity: p.capacity,
      credit_override: null,
      status: 'scheduled',
      cancel_reason: null,
      created_at: now.toISOString(),
    });
    created++;
  }
  Object.assign(p, {
    status: 'approved',
    admin_note: v.str(note, 'Note', { optional: true, max: 500 }) || null,
    reviewed_by: admin.email,
    reviewed_at: now.toISOString(),
    class_id: cls.id,
  });
  save();
  return { proposal: presentProposal(p), class_id: cls.id, sessions_created: created };
}

export async function rejectProposal(admin, id, { note } = {}) {
  const p = pending(id);
  Object.assign(p, {
    status: 'rejected',
    admin_note: v.str(note, 'A reason for the instructor', { min: 3, max: 500 }),
    reviewed_by: admin.email,
    reviewed_at: clock.now().toISOString(),
  });
  save();
  return { proposal: presentProposal(p) };
}
