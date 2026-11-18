// Member bookings: book, cancel, change. All checks run before any data
// changes, so a failed request leaves nothing half-done.
import { getDb, insert, byId, save } from '../db/store.js';
import { clock, RULES } from '../config.js';
import { conflict, forbidden, notFound, paymentRequired } from '../errors.js';
import { ACTIVE_BOOKING, bookedCount, presentBooking } from './present.js';
import { effectivePrice } from './pricing.js';
import { recordTransaction } from './credits.js';

const hoursUntil = (iso) => (new Date(iso) - clock.now()) / 3600_000;

/** Checks that `member` may book `sessionId`; returns { session, cls, price }. */
function checkBookable(member, sessionId, { creditsAvailable = member.credits } = {}) {
  const session = byId('sessions', sessionId);
  if (!session) throw notFound('Session');
  const cls = byId('classes', session.class_id);
  if (session.status !== 'scheduled' || cls.status !== 'active') throw conflict('This session is no longer running.');
  if (hoursUntil(session.starts_at) <= 0) throw conflict('This class has already started.');
  const already = getDb().bookings.some(
    (b) => b.session_id === session.id && b.member_email === member.email && ACTIVE_BOOKING.has(b.status),
  );
  if (already) throw conflict('You are already booked into this class.');
  if (bookedCount(session.id) >= session.capacity) throw conflict('This class is full.');
  const price = effectivePrice(session, cls);
  if (creditsAvailable < price) {
    throw paymentRequired(`Not enough credits: this class costs ${price}, you have ${creditsAvailable}.`);
  }
  return { session, cls, price };
}

function ownBooking(member, bookingId) {
  const booking = byId('bookings', bookingId);
  if (!booking) throw notFound('Booking');
  if (booking.member_email !== member.email) throw forbidden('That booking belongs to someone else.');
  return booking;
}

function createBooking(member, session, cls, price) {
  const booking = insert('bookings', {
    session_id: session.id,
    member_email: member.email,
    status: 'booked',
    credits_spent: price,
    refunded_credits: 0,
    created_at: clock.now().toISOString(),
    cancelled_at: null,
  });
  recordTransaction(member, -price, 'booking', { booking_id: booking.id, note: `Booked ${cls.title}` });
  return booking;
}

export async function listMyBookings(member) {
  return getDb()
    .bookings.filter((b) => b.member_email === member.email)
    .map(presentBooking)
    .sort((a, b) => a.session.starts_at.localeCompare(b.session.starts_at));
}

export async function bookSession(member, sessionId) {
  const { session, cls, price } = checkBookable(member, sessionId);
  const booking = createBooking(member, session, cls, price);
  save();
  return { booking: presentBooking(booking), balance: member.credits };
}

/** Cancel: full refund if at least RULES.lateCancelHours before class, otherwise none. */
export async function cancelBooking(member, bookingId) {
  const booking = ownBooking(member, bookingId);
  if (booking.status !== 'booked') throw conflict('Only active bookings can be cancelled.');
  const session = byId('sessions', booking.session_id);
  const hours = hoursUntil(session.starts_at);
  if (hours <= 0) throw conflict('This class has already started.');

  const refund = hours >= RULES.lateCancelHours ? booking.credits_spent : 0;
  booking.status = 'cancelled';
  booking.cancelled_at = clock.now().toISOString();
  booking.refunded_credits = refund;
  if (refund > 0) {
    recordTransaction(member, refund, 'refund', { booking_id: booking.id, note: 'Cancelled booking (refunded)' });
  }
  save();
  return { booking: presentBooking(booking), refunded: refund, late: refund === 0, balance: member.credits };
}

/** Move a booking to another session: refund the old one in full, charge the new price. */
export async function changeBooking(member, bookingId, newSessionId) {
  const booking = ownBooking(member, bookingId);
  if (booking.status !== 'booked') throw conflict('Only active bookings can be changed.');
  const oldSession = byId('sessions', booking.session_id);
  if (hoursUntil(oldSession.starts_at) < RULES.lateCancelHours) {
    throw conflict(`Bookings can only be changed at least ${RULES.lateCancelHours} hours before class.`);
  }
  if (Number(newSessionId) === oldSession.id) throw conflict('Pick a different session.');
  const { session, cls, price } = checkBookable(member, newSessionId, {
    creditsAvailable: member.credits + booking.credits_spent,
  });

  booking.status = 'cancelled';
  booking.cancelled_at = clock.now().toISOString();
  booking.refunded_credits = booking.credits_spent;
  recordTransaction(member, booking.credits_spent, 'refund', { booking_id: booking.id, note: 'Changed booking (refunded)' });
  const next = createBooking(member, session, cls, price);
  save();
  return { booking: presentBooking(next), previous: presentBooking(booking), balance: member.credits };
}
