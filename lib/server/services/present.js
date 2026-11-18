// Turns raw rows into the shapes the API returns. Passwords never leave here.
import { getDb, byId, userByEmail } from '../db/store.js';
import { effectivePrice } from './pricing.js';

export const ACTIVE_BOOKING = new Set(['booked', 'attended', 'no_show']);

export function publicUser(u) {
  if (!u) return null;
  const out = { email: u.email, role: u.role, name: u.name, zip: u.zip, bio: u.bio };
  if (u.role === 'member') out.credits = u.credits;
  if (u.role === 'instructor') out.zip_tags = u.zip_tags;
  return out;
}

const person = (email) => {
  const u = userByEmail(email);
  return u ? { email: u.email, name: u.name } : { email, name: email };
};

export function bookedCount(sessionId) {
  return getDb().bookings.filter((b) => b.session_id === sessionId && ACTIVE_BOOKING.has(b.status)).length;
}

export function presentLocation(l) {
  return l && { id: l.id, name: l.name, neighborhood: l.neighborhood, address: l.address, zip: l.zip, zip_tags: l.zip_tags };
}

export function presentClass(c) {
  return {
    id: c.id,
    title: c.title,
    discipline: c.discipline,
    level: c.level,
    description: c.description,
    duration_min: c.duration_min,
    capacity: c.capacity,
    credit_cost: c.credit_cost,
    status: c.status,
    proposal_id: c.proposal_id,
    created_by: c.created_by ?? null,
    instructor: person(c.instructor_email),
    location: presentLocation(byId('locations', c.location_id)),
  };
}

export function presentSession(s, { memberEmail } = {}) {
  const cls = byId('classes', s.class_id);
  const booked = bookedCount(s.id);
  const start = new Date(s.starts_at);
  const mine = memberEmail
    ? getDb().bookings.find((b) => b.session_id === s.id && b.member_email === memberEmail && ACTIVE_BOOKING.has(b.status))
    : null;
  return {
    id: s.id,
    starts_at: s.starts_at,
    ends_at: new Date(start.getTime() + cls.duration_min * 60_000).toISOString(),
    status: s.status,
    cancel_reason: s.cancel_reason,
    capacity: s.capacity,
    booked,
    spots_left: Math.max(0, s.capacity - booked),
    credits: effectivePrice(s, cls),
    base_credits: cls.credit_cost,
    credit_override: s.credit_override,
    class: {
      id: cls.id,
      title: cls.title,
      discipline: cls.discipline,
      level: cls.level,
      description: cls.description,
      duration_min: cls.duration_min,
      status: cls.status,
    },
    instructor: person(cls.instructor_email),
    location: presentLocation(byId('locations', cls.location_id)),
    my_booking: mine ? { id: mine.id, status: mine.status } : null,
  };
}

export function presentBooking(b) {
  return {
    id: b.id,
    member_email: b.member_email,
    status: b.status,
    credits_spent: b.credits_spent,
    refunded_credits: b.refunded_credits,
    created_at: b.created_at,
    cancelled_at: b.cancelled_at,
    session: presentSession(byId('sessions', b.session_id)),
  };
}

export function presentProposal(p) {
  return {
    ...p,
    instructor: person(p.instructor_email),
    location: presentLocation(byId('locations', p.location_id)),
  };
}
