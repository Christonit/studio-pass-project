// Shared constants and business rules for StudioPass.

export const DISCIPLINES = ['Yoga', 'Pilates', 'HIIT', 'Spin', 'Barre', 'Boxing', 'Strength', 'Dance'];

// "Level" is what the deck calls intensity.
export const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

// Roles a person can pick when creating an account. Admin accounts are seeded only.
export const SIGNUP_ROLES = ['member', 'instructor'];

// Password of every seeded demo account.
export const DEMO_PASSWORD = 'studiopass';

export const SESSION_COOKIE = 'sp_session';

export const RULES = {
  // Cancelling (or changing) at least this many hours before class refunds the credits.
  lateCancelHours: 12,
  // Instructors can start marking attendance this many minutes before class.
  attendanceOpensMinutesBefore: 60,
  maxCapacity: 60,
  maxCredits: 20,
  maxWeeklyRepeats: 12,
};

// Wrapped so tests can freeze time.
export const clock = {
  now: () => new Date(),
};
