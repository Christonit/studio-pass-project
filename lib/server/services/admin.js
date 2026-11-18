// Admin console: classes, sessions, locations (ZIP tags) and instructors.
import { getDb, insert, byId, userByEmail, save } from '../db/store.js';
import { clock, RULES } from '../config.js';
import { badRequest, conflict, notFound } from '../errors.js';
import * as v from '../validate.js';
import { bookedCount, presentClass, presentLocation, presentSession, publicUser } from './present.js';
import { parseClassFields } from './proposals.js';
import { recordTransaction } from './credits.js';

// --- Classes ---------------------------------------------------------------

function instructorEmail(value) {
  const u = userByEmail(value);
  if (!u || u.role !== 'instructor') throw badRequest('Instructor does not exist.');
  return u.email;
}

export async function listClasses() {
  const now = clock.now();
  return getDb()
    .classes.map((c) => {
      const upcoming = getDb().sessions.filter(
        (s) => s.class_id === c.id && s.status === 'scheduled' && new Date(s.starts_at) > now,
      );
      return { ...presentClass(c), upcoming_sessions: upcoming.length, next_session_at: upcoming.map((s) => s.starts_at).sort()[0] ?? null };
    })
    .sort((a, b) => (a.status === 'archived') - (b.status === 'archived') || a.title.localeCompare(b.title));
}

export async function createClass(admin, body) {
  const fields = parseClassFields(body);
  const cls = insert('classes', {
    ...fields,
    instructor_email: instructorEmail(body.instructor_email),
    status: 'active',
    proposal_id: null,
    created_by: admin.email,
    created_at: clock.now().toISOString(),
  });
  save();
  return presentClass(cls);
}

export async function updateClass(id, body) {
  const cls = byId('classes', id);
  if (!cls) throw notFound('Class');
  const patch = parseClassFields(body, { partial: true });
  if (body.instructor_email !== undefined) patch.instructor_email = instructorEmail(body.instructor_email);
  if (body.status !== undefined) patch.status = v.oneOf(body.status, 'Status', ['active', 'archived']);
  Object.assign(cls, patch);
  save();
  return presentClass(cls);
}

// --- Sessions --------------------------------------------------------------

export async function listClassSessions(classId) {
  const cls = byId('classes', classId);
  if (!cls) throw notFound('Class');
  const from = new Date(clock.now().getTime() - 7 * 86400_000);
  return getDb()
    .sessions.filter((s) => s.class_id === cls.id && new Date(s.starts_at) >= from)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .map((s) => presentSession(s));
}

function creditOverride(value) {
  if (value === null || value === '' || value === undefined) return null;
  return v.int(value, 'Credit override', { min: 0, max: RULES.maxCredits });
}

export async function addSession(classId, body) {
  const cls = byId('classes', classId);
  if (!cls) throw notFound('Class');
  const s = insert('sessions', {
    class_id: cls.id,
    starts_at: v.futureDate(body.starts_at, 'Start time'),
    capacity: body.capacity ? v.int(body.capacity, 'Capacity', { min: 1, max: RULES.maxCapacity }) : cls.capacity,
    credit_override: creditOverride(body.credit_override),
    status: 'scheduled',
    cancel_reason: null,
    created_at: clock.now().toISOString(),
  });
  save();
  return presentSession(s);
}

/** Change time, capacity or price. Existing bookings keep the price they paid. */
export async function updateSession(id, body) {
  const s = byId('sessions', id);
  if (!s) throw notFound('Session');
  if (s.status !== 'scheduled') throw conflict('This session is cancelled.');
  if (new Date(s.starts_at) <= clock.now()) throw conflict('This session has already started.');
  const patch = {};
  if (body.starts_at !== undefined) patch.starts_at = v.futureDate(body.starts_at, 'Start time');
  if (body.capacity !== undefined) {
    patch.capacity = v.int(body.capacity, 'Capacity', { min: 1, max: RULES.maxCapacity });
    const booked = bookedCount(s.id);
    if (patch.capacity < booked) throw conflict(`${booked} people are already booked; capacity cannot go below that.`);
  }
  if (body.credit_override !== undefined) patch.credit_override = creditOverride(body.credit_override);
  Object.assign(s, patch);
  save();
  return presentSession(s);
}

/** Cancel a session and refund everyone who is booked. */
export async function cancelSession(id, { reason } = {}) {
  const s = byId('sessions', id);
  if (!s) throw notFound('Session');
  if (s.status === 'cancelled') throw conflict('This session is already cancelled.');
  const why = v.str(reason, 'Reason', { optional: true, max: 200 }) || 'Cancelled by the studio.';
  const now = clock.now().toISOString();
  let refunded = 0;
  for (const b of getDb().bookings.filter((x) => x.session_id === s.id && x.status === 'booked')) {
    const member = userByEmail(b.member_email);
    b.status = 'cancelled';
    b.cancelled_at = now;
    b.refunded_credits = b.credits_spent;
    if (member) recordTransaction(member, b.credits_spent, 'refund', { booking_id: b.id, note: 'Session cancelled by studio' });
    refunded++;
  }
  s.status = 'cancelled';
  s.cancel_reason = why;
  save();
  return { session: presentSession(s), members_refunded: refunded };
}

// --- Locations (studio ZIP tags) --------------------------------------------

function parseLocation(body, { partial = false } = {}) {
  const out = {};
  const has = (k) => !partial || body[k] !== undefined;
  if (has('name')) out.name = v.str(body.name, 'Name', { min: 2, max: 80 });
  if (has('neighborhood')) out.neighborhood = v.str(body.neighborhood, 'Neighborhood', { optional: true, max: 60 });
  if (has('address')) out.address = v.str(body.address, 'Address', { optional: true, max: 120 });
  if (has('zip')) out.zip = v.zip(body.zip);
  if (has('zip_tags')) out.zip_tags = v.zipList(body.zip_tags);
  return out;
}

export async function listLocations() {
  return getDb().locations.map((l) => ({
    ...presentLocation(l),
    class_count: getDb().classes.filter((c) => c.location_id === l.id && c.status === 'active').length,
  }));
}

export async function createLocation(admin, body) {
  const l = insert('locations', { ...parseLocation(body), created_by: admin.email, created_at: clock.now().toISOString() });
  save();
  return presentLocation(l);
}

export async function updateLocation(id, body) {
  const l = byId('locations', id);
  if (!l) throw notFound('Location');
  Object.assign(l, parseLocation(body, { partial: true }));
  save();
  return presentLocation(l);
}

// --- Instructors (ZIP tags) -------------------------------------------------

export async function listInstructors() {
  return getDb()
    .users.filter((u) => u.role === 'instructor')
    .map((u) => ({
      ...publicUser(u),
      class_count: getDb().classes.filter((c) => c.instructor_email === u.email && c.status === 'active').length,
    }));
}

export async function updateInstructor(email, body) {
  const u = userByEmail(email);
  if (!u || u.role !== 'instructor') throw notFound('Instructor');
  if (body.zip_tags !== undefined) u.zip_tags = v.zipList(body.zip_tags);
  if (body.zip !== undefined) u.zip = v.zip(body.zip);
  save();
  return publicUser(u);
}
