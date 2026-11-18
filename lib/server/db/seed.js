// PLACEHOLDER SEED DATA
// Fake studios, people, classes and bookings so every page has something to
// show. Dates are relative to "now", so there are always past sessions (for
// attendance) and upcoming ones (for booking). Run `npm run reset` to rebuild.
// Every seeded account signs in with the password in DEMO_PASSWORD.
import { DEMO_PASSWORD } from '../config.js';

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LOCATIONS = [
  { key: 'wburg', name: 'StudioPass Williamsburg', neighborhood: 'Williamsburg', address: '214 Bedford Ave, Brooklyn, NY', zip: '11211', zip_tags: ['11249', '11206'] },
  { key: 'slope', name: 'StudioPass Park Slope', neighborhood: 'Park Slope', address: '88 7th Ave, Brooklyn, NY', zip: '11215', zip_tags: ['11217', '11238'] },
  { key: 'chelsea', name: 'StudioPass Chelsea', neighborhood: 'Chelsea', address: '150 W 23rd St, New York, NY', zip: '10011', zip_tags: ['10001', '10010'] },
  { key: 'astoria', name: 'StudioPass Astoria', neighborhood: 'Astoria', address: '31-12 30th Ave, Queens, NY', zip: '11103', zip_tags: ['11102', '11105'] },
];

const PACKAGES = [
  { key: 'p5', name: 'Starter 5', credits: 5, price_usd: 55 },
  { key: 'p10', name: 'Regular 10', credits: 10, price_usd: 100 },
  { key: 'p20', name: 'Committed 20', credits: 20, price_usd: 180 },
  { key: 'p40', name: 'Studio 40', credits: 40, price_usd: 320 },
];

const ADMIN = { key: 'admin', role: 'admin', name: 'Alex Rivera', email: 'admin@studiopass.test', zip: '10011', bio: 'Studio network manager.' };

const INSTRUCTORS = [
  { key: 'maya', name: 'Maya Chen', email: 'maya@studiopass.test', zip: '11211', zip_tags: ['11211', '11215', '11103'], bio: 'RYT-500 yoga teacher. Vinyasa, yin and breathwork.' },
  { key: 'jordan', name: 'Jordan Brooks', email: 'jordan@studiopass.test', zip: '10011', zip_tags: ['10011', '11103'], bio: 'Strength coach and former amateur boxer.' },
  { key: 'priya', name: 'Priya Patel', email: 'priya@studiopass.test', zip: '11215', zip_tags: ['10011', '11211', '11215'], bio: 'Pilates and barre, focused on core and posture.' },
  { key: 'sam', name: 'Sam Okafor', email: 'sam@studiopass.test', zip: '11103', zip_tags: ['11103'], bio: 'Indoor cycling, rhythm rides and intervals.' },
];

// Demo members you can sign in as. `buys` = packages bought three weeks ago.
const MEMBERS = [
  { key: 'taylor', name: 'Taylor Kim', email: 'taylor@example.test', zip: '11211', buys: ['p20'] },
  { key: 'riley', name: 'Riley Garcia', email: 'riley@example.test', zip: '11215', buys: ['p40'] },
  { key: 'morgan', name: 'Morgan Lee', email: 'morgan@example.test', zip: '10011', buys: ['p5'] },
  { key: 'casey', name: 'Casey Nguyen', email: 'casey@example.test', zip: '11103', buys: [] },
];

const FIRST = ['Jamie', 'Avery', 'Drew', 'Quinn', 'Rowan', 'Skyler', 'Parker', 'Reese', 'Emerson', 'Hayden', 'Sasha', 'Kendall', 'Jules', 'Logan', 'Dakota', 'Elliot', 'Marley', 'Remy', 'Shay', 'Toni', 'Blake', 'Cameron', 'Frankie', 'Harper', 'Indy', 'Kai', 'Lane', 'Noa', 'Oakley', 'Peyton'];
const LAST = ['Torres', 'Johnson', 'Martin', 'Davis', 'Singh', 'Cohen', 'Ramirez', 'Walker', 'Ali', 'Murphy', 'Rossi', 'Novak', 'Baker', 'Kowalski', 'Haddad', 'Silva', 'Brown', 'Ortiz', 'Park', 'Mensah', 'Diaz', 'Evans', 'Fischer', 'Green', 'Hughes', 'Ibrahim', 'James', 'Khan', 'Lopez', 'Moreno'];
const MEMBER_ZIPS = ['11211', '11249', '11215', '11217', '10011', '10001', '11103', '11105'];

// days: 0 = Sunday … 6 = Saturday
const CLASSES = [
  { key: 'sunrise', title: 'Sunrise Vinyasa', discipline: 'Yoga', level: 'Beginner', instructor: 'maya', location: 'wburg', duration_min: 60, capacity: 16, credit_cost: 2, days: [1, 3, 5], time: [7, 0], description: 'A gentle flow to wake up the body. Mats provided.' },
  { key: 'power', title: 'Power Flow', discipline: 'Yoga', level: 'Intermediate', instructor: 'maya', location: 'slope', duration_min: 75, capacity: 14, credit_cost: 3, days: [2, 4, 6], time: [18, 30], description: 'Strong, sweaty vinyasa with arm balances and inversions.' },
  { key: 'yin', title: 'Restorative Yin', discipline: 'Yoga', level: 'Beginner', instructor: 'maya', location: 'astoria', duration_min: 60, capacity: 10, credit_cost: 1, days: [0, 3], time: [19, 30], description: 'Long, supported holds to slow down. Small group.' },
  { key: 'hiit', title: 'HIIT Express', discipline: 'HIIT', level: 'Intermediate', instructor: 'jordan', location: 'chelsea', duration_min: 45, capacity: 20, credit_cost: 2, days: [1, 2, 4], time: [12, 15], description: 'Lunch-break intervals: 40 seconds on, 20 seconds off.' },
  { key: 'boxing', title: 'Boxing Bootcamp', discipline: 'Boxing', level: 'Advanced', instructor: 'jordan', location: 'astoria', duration_min: 60, capacity: 12, credit_cost: 3, days: [3, 6], time: [9, 0], description: 'Bag work, footwork and conditioning. Bring wraps.' },
  { key: 'pilates', title: 'Mat Pilates Core', discipline: 'Pilates', level: 'Beginner', instructor: 'priya', location: 'chelsea', duration_min: 50, capacity: 12, credit_cost: 2, days: [2, 5], time: [8, 0], description: 'Classical mat sequence focused on core control.' },
  { key: 'barre', title: 'Barre Burn', discipline: 'Barre', level: 'Intermediate', instructor: 'priya', location: 'wburg', duration_min: 50, capacity: 15, credit_cost: 2, days: [0, 4], time: [10, 0], description: 'Small, high-rep movements at the barre. Grip socks recommended.' },
  { key: 'ride', title: 'Rhythm Ride', discipline: 'Spin', level: 'Intermediate', instructor: 'sam', location: 'astoria', duration_min: 45, capacity: 18, credit_cost: 2, days: [1, 3, 6], time: [18, 0], description: 'Ride to the beat. Clip-in shoes available at the desk.' },
];

export function buildSeed(now = new Date()) {
  const rand = mulberry32(9590);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const iso = (d) => d.toISOString();
  const at = (dayOffset, h = 0, m = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, m, 0, 0);
    return d;
  };
  const hoursBefore = (d, h) => new Date(d.getTime() - h * 3600_000);

  const db = {
    meta: { placeholder: true, seeded_at: iso(now) },
    seq: {},
    users: [],
    locations: [],
    credit_packages: [],
    credit_transactions: [],
    classes: [],
    sessions: [],
    bookings: [],
    proposals: [],
  };
  const add = (table, row) => {
    db.seq[table] = (db.seq[table] ?? 0) + 1;
    const rec = { id: db.seq[table], ...row };
    db[table].push(rec);
    return rec;
  };

  const created = iso(at(-60, 9));
  const loc = {};
  for (const { key, ...l } of LOCATIONS) loc[key] = add('locations', { ...l, created_at: created });

  const pkg = {};
  for (const { key, ...p } of PACKAGES) pkg[key] = add('credit_packages', { ...p, active: true });

  // Users have no numeric id: the email is the primary key.
  const user = (u) => {
    const rec = {
      email: u.email,
      password: DEMO_PASSWORD, // plain text on purpose (prototype)
      role: u.role,
      name: u.name,
      zip: u.zip,
      credits: u.role === 'member' ? 0 : null,
      zip_tags: u.zip_tags ?? [],
      bio: u.bio ?? '',
      demo: Boolean(u.demo),
      created_at: created,
    };
    db.users.push(rec);
    return rec;
  };

  const people = {};
  people.admin = user({ ...ADMIN, demo: true });
  for (const i of INSTRUCTORS) people[i.key] = user({ ...i, role: 'instructor', demo: true });

  const txn = (member, delta, type, extra, createdAt) => {
    member.credits += delta;
    add('credit_transactions', {
      member_email: member.email,
      delta,
      type,
      package_id: extra.package_id ?? null,
      booking_id: extra.booking_id ?? null,
      amount_usd: extra.amount_usd ?? null,
      note: extra.note ?? '',
      created_at: iso(createdAt),
    });
  };
  const buy = (member, p, when) =>
    txn(member, p.credits, 'purchase', { package_id: p.id, amount_usd: p.price_usd, note: `Bought ${p.name} (simulated payment)` }, when);

  const members = [];
  for (const m of MEMBERS) {
    const u = user({ ...m, role: 'member', demo: true });
    people[m.key] = u;
    for (const k of m.buys) buy(u, pkg[k], at(-21, 10));
    members.push(u);
  }
  const crowd = [];
  for (let i = 0; i < 12; i++) {
    const name = `${FIRST[i]} ${LAST[(i * 7) % LAST.length]}`;
    const u = user({ role: 'member', name, email: `${name.toLowerCase().replace(' ', '.')}@example.test`, zip: pick(MEMBER_ZIPS) });
    buy(u, pkg.p40, at(-21, 12));
    crowd.push(u);
  }

  // --- Proposals + classes ------------------------------------------------
  const cls = {};
  for (const { key, instructor, location, days, time, ...c } of CLASSES) {
    cls[key] = add('classes', {
      ...c,
      instructor_email: people[instructor].email,
      location_id: loc[location].id,
      status: 'active',
      proposal_id: null,
      created_at: created,
      _days: days,
      _time: time,
    });
  }

  // Barre Burn came in through the proposal flow.
  const barreProposal = add('proposals', {
    instructor_email: people.priya.email,
    title: 'Barre Burn',
    discipline: 'Barre',
    level: 'Intermediate',
    description: cls.barre.description,
    location_id: loc.wburg.id,
    duration_min: 50,
    capacity: 15,
    credit_cost: 2,
    first_session_at: iso(at(-28, 10)),
    weekly_repeats: 12,
    status: 'approved',
    admin_note: 'Great fit for weekend mornings in Williamsburg.',
    reviewed_by: people.admin.email,
    reviewed_at: iso(at(-33, 15)),
    class_id: cls.barre.id,
    created_at: iso(at(-35, 11)),
  });
  cls.barre.proposal_id = barreProposal.id;

  const proposal = (p) =>
    add('proposals', {
      admin_note: null,
      reviewed_by: null,
      reviewed_at: null,
      class_id: null,
      status: 'pending',
      ...p,
    });
  proposal({
    instructor_email: people.sam.email, title: 'Climb & Sprint Intervals', discipline: 'Spin', level: 'Advanced',
    description: 'Hill climbs and all-out sprints, built around power zones.', location_id: loc.astoria.id,
    duration_min: 45, capacity: 16, credit_cost: 3, first_session_at: iso(at(5, 18, 30)), weekly_repeats: 6, created_at: iso(at(-2, 16)),
  });
  proposal({
    instructor_email: people.priya.email, title: 'Prenatal Pilates', discipline: 'Pilates', level: 'Beginner',
    description: 'Safe, supportive Pilates for every trimester.', location_id: loc.slope.id,
    duration_min: 50, capacity: 10, credit_cost: 2, first_session_at: iso(at(8, 10)), weekly_repeats: 8, created_at: iso(at(-1, 9)),
  });
  proposal({
    instructor_email: people.maya.email, title: 'Yoga for Runners', discipline: 'Yoga', level: 'Intermediate',
    description: 'Hips, hamstrings and calves: mobility for people who run.', location_id: loc.wburg.id,
    duration_min: 60, capacity: 14, credit_cost: 2, first_session_at: iso(at(6, 19)), weekly_repeats: 4, created_at: iso(at(-3, 20)),
  });
  proposal({
    instructor_email: people.jordan.email, title: 'Midnight Kettlebells', discipline: 'Strength', level: 'Advanced',
    description: 'Late-night kettlebell complexes.', location_id: loc.chelsea.id,
    duration_min: 45, capacity: 12, credit_cost: 2, first_session_at: iso(at(3, 23)), weekly_repeats: 4,
    status: 'rejected', admin_note: 'Chelsea closes at 10 pm. Could you propose a slot that ends by 9:30 pm?',
    reviewed_by: people.admin.email, reviewed_at: iso(at(-5, 14)), created_at: iso(at(-7, 22)),
  });

  // --- Sessions: one week back, two weeks ahead ----------------------------
  for (const c of Object.values(cls)) {
    for (let d = -5; d <= 9; d++) {
      const start = at(d, c._time[0], c._time[1]);
      if (!c._days.includes(start.getDay())) continue;
      add('sessions', {
        class_id: c.id,
        starts_at: iso(start),
        capacity: c.capacity,
        credit_override: null,
        status: 'scheduled',
        cancel_reason: null,
        created_at: created,
      });
    }
    delete c._days;
    delete c._time;
  }

  const sessionsOf = (c) => db.sessions.filter((s) => s.class_id === c.id).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const upcoming = (c) => sessionsOf(c).filter((s) => new Date(s.starts_at) > now);
  const past = (c) => sessionsOf(c).filter((s) => new Date(s.starts_at) <= now);

  // A promo price on the next Sunrise Vinyasa.
  upcoming(cls.sunrise)[0].credit_override = 1;

  const ACTIVE = new Set(['booked', 'attended', 'no_show']);
  const priceOf = (s) => s.credit_override ?? db.classes.find((c) => c.id === s.class_id).credit_cost;
  const taken = (s) => db.bookings.filter((b) => b.session_id === s.id && ACTIVE.has(b.status)).length;

  const book = (member, s, status = 'booked') => {
    if (!s || s.status !== 'scheduled') return null;
    const price = priceOf(s);
    if (member.credits < price || taken(s) >= s.capacity) return null;
    if (db.bookings.some((b) => b.session_id === s.id && b.member_email === member.email && b.status !== 'cancelled')) return null;
    const start = new Date(s.starts_at);
    let when = hoursBefore(start, 24 + Math.floor(rand() * 72));
    if (when > now) when = hoursBefore(now, 1 + Math.floor(rand() * 5));
    const title = db.classes.find((c) => c.id === s.class_id).title;
    const b = add('bookings', {
      session_id: s.id,
      member_email: member.email,
      status,
      credits_spent: price,
      refunded_credits: 0,
      created_at: iso(when),
      cancelled_at: null,
    });
    txn(member, -price, 'booking', { booking_id: b.id, note: `Booked ${title}` }, when);
    return b;
  };

  // Past sessions that ended in the last two days still need attendance taken.
  const pastStatus = (s) => {
    const hoursAgo = (now - new Date(s.starts_at)) / 3600_000;
    if (hoursAgo < 48) return 'booked';
    return rand() < 0.85 ? 'attended' : 'no_show';
  };

  // Demo members first, so they always get their spots.
  const { taylor, riley, morgan } = people;
  book(taylor, upcoming(cls.barre)[0]);
  book(taylor, upcoming(cls.sunrise)[1]);
  for (const s of past(cls.sunrise).slice(-2)) book(taylor, s, 'attended');
  book(taylor, past(cls.hiit)[0], 'no_show');
  book(riley, upcoming(cls.power)[0]);
  book(riley, upcoming(cls.pilates)[0]);
  book(riley, upcoming(cls.ride)[1]);
  for (const s of past(cls.power).slice(0, 2)) book(riley, s, 'attended');
  book(morgan, upcoming(cls.hiit)[0]);

  // Fill the rest from the crowd.
  const fullYin = upcoming(cls.yin)[0];
  for (const s of db.sessions) {
    const start = new Date(s.starts_at);
    const daysOut = (start - now) / 86400_000;
    let ratio;
    if (s === fullYin) ratio = 1;
    else if (daysOut <= 0) ratio = 0.5 + rand() * 0.5;
    else ratio = Math.max(0.1, 0.9 - daysOut * 0.06) * (0.6 + rand() * 0.4);
    const target = Math.round(s.capacity * ratio);
    const pool = [...crowd].sort(() => rand() - 0.5);
    for (const m of pool) {
      if (taken(s) >= target) break;
      book(m, s, daysOut <= 0 ? pastStatus(s) : 'booked');
    }
  }
  // Attendance for demo members' past bookings follows the same 48h rule.
  for (const b of db.bookings) {
    const s = db.sessions.find((x) => x.id === b.session_id);
    if ((now - new Date(s.starts_at)) / 3600_000 < 48 && new Date(s.starts_at) <= now) b.status = 'booked';
  }

  // A few member cancellations with refunds, for history.
  for (const m of crowd.slice(0, 4)) {
    const b = db.bookings.find((x) => x.member_email === m.email && x.status === 'booked' && new Date(db.sessions.find((s) => s.id === x.session_id).starts_at) > now);
    if (!b) continue;
    const when = hoursBefore(now, 3);
    b.status = 'cancelled';
    b.cancelled_at = iso(when);
    b.refunded_credits = b.credits_spent;
    txn(m, b.credits_spent, 'refund', { booking_id: b.id, note: 'Cancelled booking (refunded)' }, when);
  }

  // One upcoming session cancelled by the admin; everyone was refunded.
  const cancelled = upcoming(cls.boxing)[0];
  cancelled.status = 'cancelled';
  cancelled.cancel_reason = 'Instructor unavailable. All credits refunded.';
  for (const b of db.bookings.filter((x) => x.session_id === cancelled.id && x.status === 'booked')) {
    const when = hoursBefore(now, 6);
    b.status = 'cancelled';
    b.cancelled_at = iso(when);
    b.refunded_credits = b.credits_spent;
    const member = db.users.find((u) => u.email === b.member_email);
    txn(member, b.credits_spent, 'refund', { booking_id: b.id, note: 'Session cancelled by studio' }, when);
  }

  return db;
}
