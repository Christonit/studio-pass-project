// Class discovery for members.
import { getDb, byId, userByEmail } from '../db/store.js';
import { clock, DISCIPLINES, LEVELS, RULES, SIGNUP_ROLES } from '../config.js';
import { notFound } from '../errors.js';
import { presentLocation, presentSession } from './present.js';

export async function getMeta() {
  return {
    disciplines: DISCIPLINES,
    levels: LEVELS,
    signupRoles: SIGNUP_ROLES,
    locations: getDb().locations.map(presentLocation),
    rules: {
      lateCancelHours: RULES.lateCancelHours,
      maxCapacity: RULES.maxCapacity,
      maxCredits: RULES.maxCredits,
      maxWeeklyRepeats: RULES.maxWeeklyRepeats,
    },
  };
}

export function matchesZip(location, zip) {
  return location.zip === zip || (location.zip_tags ?? []).includes(zip);
}

export async function searchSessions(filters = {}, memberEmail) {
  const now = clock.now();
  const days = Number(filters.days) || null;
  const until = days ? new Date(now.getTime() + days * 86400_000) : null;
  const q = (filters.q ?? '').trim().toLowerCase();
  const zip = (filters.zip ?? '').trim();

  return getDb()
    .sessions.filter((s) => {
      if (s.status !== 'scheduled') return false;
      const start = new Date(s.starts_at);
      if (start <= now || (until && start > until)) return false;
      const cls = byId('classes', s.class_id);
      if (!cls || cls.status !== 'active') return false;
      if (filters.discipline && cls.discipline !== filters.discipline) return false;
      if (filters.level && cls.level !== filters.level) return false;
      if (filters.location_id && cls.location_id !== Number(filters.location_id)) return false;
      if (filters.class_id && cls.id !== Number(filters.class_id)) return false;
      if (zip && !matchesZip(byId('locations', cls.location_id), zip)) return false;
      if (q) {
        const instructor = userByEmail(cls.instructor_email);
        const hay = `${cls.title} ${cls.description} ${cls.discipline} ${instructor?.name ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .map((s) => presentSession(s, { memberEmail }));
}

export async function getSession(id, memberEmail) {
  const s = byId('sessions', id);
  if (!s) throw notFound('Session');
  return presentSession(s, { memberEmail });
}
