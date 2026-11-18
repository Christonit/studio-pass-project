// Instructor views: their sessions, rosters and attendance.
import { getDb, byId, userByEmail, save } from '../db/store.js';
import { clock, RULES } from '../config.js';
import { badRequest, conflict, forbidden, notFound } from '../errors.js';
import { presentSession } from './present.js';

function ownSession(viewer, sessionId) {
  const s = byId('sessions', sessionId);
  if (!s) throw notFound('Session');
  // Admins may view any roster; instructors only their own.
  if (viewer.role !== 'admin' && byId('classes', s.class_id).instructor_email !== viewer.email) {
    throw forbidden('That session is not yours.');
  }
  return s;
}

function attendanceOpen(s) {
  return new Date(s.starts_at) - clock.now() <= RULES.attendanceOpensMinutesBefore * 60_000;
}

function needsAttendance(s) {
  if (s.status !== 'scheduled' || new Date(s.starts_at) > clock.now()) return false;
  return getDb().bookings.some((b) => b.session_id === s.id && b.status === 'booked');
}

export async function listMySessions(instructor, { pastDays = 7 } = {}) {
  const from = new Date(clock.now().getTime() - pastDays * 86400_000);
  const myClassIds = new Set(getDb().classes.filter((c) => c.instructor_email === instructor.email).map((c) => c.id));
  return getDb()
    .sessions.filter((s) => myClassIds.has(s.class_id) && new Date(s.starts_at) >= from)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .map((s) => ({ ...presentSession(s), needs_attendance: needsAttendance(s) }));
}

export async function getRoster(viewer, sessionId) {
  const s = ownSession(viewer, sessionId);
  const roster = getDb()
    .bookings.filter((b) => b.session_id === s.id)
    .map((b) => {
      const m = userByEmail(b.member_email);
      return { booking_id: b.id, status: b.status, created_at: b.created_at, member: { email: b.member_email, name: m?.name ?? b.member_email } };
    })
    .sort((a, b) => (a.status === 'cancelled') - (b.status === 'cancelled') || a.member.name.localeCompare(b.member.name));
  return { session: presentSession(s), attendance_open: attendanceOpen(s) && s.status === 'scheduled', roster };
}

export async function markAttendance(viewer, bookingId, status) {
  if (!['attended', 'no_show', 'booked'].includes(status)) throw badRequest('Status must be attended, no_show or booked.');
  const b = byId('bookings', bookingId);
  if (!b) throw notFound('Booking');
  const s = ownSession(viewer, b.session_id);
  if (s.status !== 'scheduled') throw conflict('This session was cancelled.');
  if (b.status === 'cancelled') throw conflict('This booking was cancelled.');
  if (!attendanceOpen(s)) {
    throw conflict(`Attendance opens ${RULES.attendanceOpensMinutesBefore} minutes before class.`);
  }
  b.status = status;
  save();
  return { booking_id: b.id, status: b.status };
}
