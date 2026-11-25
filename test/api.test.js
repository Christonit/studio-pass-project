// Tests for the business rules and the route-handler wrapper, against the
// in-memory store (never touches data/db.json). Run with `npm test`.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.STUDIOPASS_PERSIST = '0';
const { getDb, resetDb, byId, userByEmail } = await import('../lib/server/db/store.js');
const { clock, DEMO_PASSWORD } = await import('../lib/server/config.js');
const { handler, sessionCookie } = await import('../lib/server/http.js');
const auth = await import('../lib/server/services/auth.js');
const bookings = await import('../lib/server/services/bookings.js');
const credits = await import('../lib/server/services/credits.js');
const catalog = await import('../lib/server/services/catalog.js');
const proposals = await import('../lib/server/services/proposals.js');
const admin = await import('../lib/server/services/admin.js');
const instructor = await import('../lib/server/services/instructor.js');
const reports = await import('../lib/server/services/reports.js');
const { pricingSignal } = await import('../lib/server/services/pricing.js');

beforeEach(() => {
  clock.now = () => new Date();
  resetDb();
});

const taylor = () => userByEmail('taylor@example.test');
const casey = () => userByEmail('casey@example.test');
const boss = () => userByEmail('admin@studiopass.test');
const maya = () => userByEmail('maya@studiopass.test');
const ledgerSum = (email) =>
  getDb().credit_transactions.filter((t) => t.member_email === email).reduce((s, t) => s + t.delta, 0);
const rejects = (promise, status) => assert.rejects(promise, (e) => e.status === status);

function openSession({ notBookedBy } = {}) {
  const db = getDb();
  return db.sessions.find((s) => {
    const booked = db.bookings.filter((b) => b.session_id === s.id && b.status !== 'cancelled');
    return (
      s.status === 'scheduled' &&
      byId('classes', s.class_id).status === 'active' &&
      new Date(s.starts_at) - Date.now() > 13 * 3600_000 &&
      booked.length < s.capacity &&
      !booked.some((b) => b.member_email === notBookedBy?.email)
    );
  });
}

// Calls a wrapped handler like Next.js would.
async function call(fn, opts, { method = 'GET', as, body, params = {}, url = 'http://test/api/x' } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (as) headers.cookie = sessionCookie(as).split(';')[0];
  const res = await handler(fn, opts)(new Request(url, { method, headers, body: body && JSON.stringify(body) }), {
    params: Promise.resolve(params),
  });
  return { status: res.status, body: await res.json(), setCookie: res.headers.get('set-cookie') };
}

// --- Data -------------------------------------------------------------------

test('seed: users keyed by email, balances match ledger, nothing overbooked', () => {
  const db = getDb();
  assert.ok(db.users.every((u) => u.email && !('id' in u)));
  assert.equal(new Set(db.users.map((u) => u.email)).size, db.users.length);
  for (const m of db.users.filter((u) => u.role === 'member')) assert.equal(m.credits, ledgerSum(m.email));
  for (const s of db.sessions) {
    const taken = db.bookings.filter((b) => b.session_id === s.id && b.status !== 'cancelled').length;
    assert.ok(taken <= s.capacity);
  }
  assert.ok(db.bookings.every((b) => userByEmail(b.member_email)));
});

// --- Accounts -----------------------------------------------------------------

test('sign up works immediately, then login with the same plain-text password', async () => {
  const user = await auth.signup({ name: 'Sam Student', email: 'Sam@School.edu', password: 'pass1234', zip: '10010' });
  assert.equal(user.email, 'sam@school.edu');
  assert.equal(user.role, 'member');
  assert.equal(user.credits, 0);
  assert.equal(user.password, undefined, 'password never returned');
  assert.equal(userByEmail('sam@school.edu').password, 'pass1234');
  const again = await auth.login({ email: 'sam@school.edu', password: 'pass1234' });
  assert.equal(again.email, 'sam@school.edu');
  await rejects(auth.login({ email: 'sam@school.edu', password: 'nope' }), 401);
});

test('duplicate email is rejected; instructors can sign up, admins cannot', async () => {
  await rejects(auth.signup({ name: 'Copy', email: 'taylor@example.test', password: 'pass1234', zip: '10010' }), 409);
  const inst = await auth.signup({ name: 'New Coach', email: 'coach@x.test', password: 'pass1234', zip: '11211', role: 'instructor' });
  assert.equal(inst.role, 'instructor');
  await rejects(auth.signup({ name: 'Sneaky', email: 'boss@x.test', password: 'pass1234', zip: '11211', role: 'admin' }), 400);
});

test('demo accounts sign in with the demo password', async () => {
  const u = await auth.login({ email: 'admin@studiopass.test', password: DEMO_PASSWORD });
  assert.equal(u.role, 'admin');
});

test('handler: session cookie identifies the user, roles are enforced', async () => {
  const me = (opts) => call(({ user }) => ({ email: user.email }), { roles: ['member'] }, opts);
  assert.equal((await me({})).status, 401);
  assert.equal((await me({ as: 'maya@studiopass.test' })).status, 403);
  const ok = await me({ as: 'taylor@example.test' });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.email, 'taylor@example.test');
  const err = await call(() => bookings.bookSession(casey(), openSession().id), { roles: ['member'] }, { as: 'casey@example.test' });
  assert.equal(err.status, 402);
  assert.match(err.body.error, /Not enough credits/);
});

// --- Booking + credits ----------------------------------------------------------

test('booking deducts credits; double booking blocked', async () => {
  const me = taylor();
  const s = openSession({ notBookedBy: me });
  const before = me.credits;
  const r = await bookings.bookSession(me, s.id);
  assert.equal(r.balance, before - r.booking.credits_spent);
  assert.equal(r.booking.member_email, me.email);
  assert.equal(me.credits, ledgerSum(me.email));
  await rejects(bookings.bookSession(me, s.id), 409);
});

test('capacity is enforced', async () => {
  const s = openSession();
  s.capacity = getDb().bookings.filter((b) => b.session_id === s.id && b.status !== 'cancelled').length;
  await rejects(bookings.bookSession(taylor(), s.id), 409);
});

test('cancel 12h+ before refunds; late cancel does not', async () => {
  const me = taylor();
  const b1 = await bookings.bookSession(me, openSession({ notBookedBy: me }).id);
  const r1 = await bookings.cancelBooking(me, b1.booking.id);
  assert.equal(r1.refunded, b1.booking.credits_spent);

  const s2 = openSession({ notBookedBy: me });
  const b2 = await bookings.bookSession(me, s2.id);
  clock.now = () => new Date(new Date(s2.starts_at).getTime() - 2 * 3600_000);
  const r2 = await bookings.cancelBooking(me, b2.booking.id);
  assert.equal(r2.refunded, 0);
  assert.equal(me.credits, ledgerSum(me.email));
});

test('change booking moves to another session and settles credits', async () => {
  const me = taylor();
  const s1 = openSession({ notBookedBy: me });
  const b = await bookings.bookSession(me, s1.id);
  const s2 = getDb().sessions.find(
    (s) =>
      s.id !== s1.id &&
      s.status === 'scheduled' &&
      new Date(s.starts_at) > Date.now() + 13 * 3600_000 &&
      !getDb().bookings.some((x) => x.session_id === s.id && x.member_email === me.email && x.status !== 'cancelled') &&
      getDb().bookings.filter((x) => x.session_id === s.id && x.status !== 'cancelled').length < s.capacity,
  );
  const r = await bookings.changeBooking(me, b.booking.id, s2.id);
  assert.equal(r.booking.session.id, s2.id);
  assert.equal(r.previous.status, 'cancelled');
  assert.equal(me.credits, ledgerSum(me.email));
});

test("members cannot touch someone else's booking", async () => {
  const other = getDb().bookings.find((b) => b.member_email !== taylor().email && b.status === 'booked');
  await rejects(bookings.cancelBooking(taylor(), other.id), 403);
});

test('simulated purchase adds credits to the right account', async () => {
  const me = casey();
  await credits.purchasePackage(me, 1);
  assert.equal(me.credits, 5);
  assert.equal(ledgerSum(me.email), 5);
});

test('filter by discipline, level and ZIP tag', async () => {
  const yoga = await catalog.searchSessions({ discipline: 'Yoga', level: 'Beginner' });
  assert.ok(yoga.length && yoga.every((s) => s.class.discipline === 'Yoga' && s.class.level === 'Beginner'));
  const byTag = await catalog.searchSessions({ zip: '11249' });
  assert.ok(byTag.length && byTag.every((s) => s.location.neighborhood === 'Williamsburg'));
});

// --- Proposals + admin ----------------------------------------------------------------

test('proposal flow: new instructor proposes, admin approves into class + sessions', async () => {
  const coach = await auth.signup({ name: 'New Coach', email: 'coach@x.test', password: 'pass', zip: '11211', role: 'instructor' });
  const first = new Date(Date.now() + 3 * 86400_000).toISOString();
  const p = await proposals.createProposal(coach, {
    title: 'Sound Bath Flow', discipline: 'Yoga', level: 'Beginner', location_id: 1,
    duration_min: 60, capacity: 12, credit_cost: 2, first_session_at: first, weekly_repeats: 3,
  });
  assert.equal(p.instructor_email, 'coach@x.test');
  const ok = await proposals.approveProposal(boss(), p.id);
  assert.equal(ok.sessions_created, 3);
  assert.equal(byId('classes', ok.class_id).instructor_email, 'coach@x.test');
  assert.equal(byId('proposals', p.id).reviewed_by, 'admin@studiopass.test');
  await rejects(proposals.rejectProposal(boss(), p.id, { note: 'nope' }), 409);
  assert.equal((await instructor.listMySessions(userByEmail('coach@x.test'))).length, 3);
});

test('reject needs a reason', async () => {
  const pending = getDb().proposals.find((p) => p.status === 'pending');
  await rejects(proposals.rejectProposal(boss(), pending.id, {}), 400);
});

test('admin cancels a session and everyone booked is refunded', async () => {
  const s = getDb().sessions.find(
    (x) => x.status === 'scheduled' && new Date(x.starts_at) > Date.now() && getDb().bookings.some((b) => b.session_id === x.id && b.status === 'booked'),
  );
  const r = await admin.cancelSession(s.id, { reason: 'Burst pipe' });
  assert.ok(r.members_refunded > 0);
  for (const m of getDb().users.filter((u) => u.role === 'member')) assert.equal(m.credits, ledgerSum(m.email));
});

test('admin cannot drop capacity below bookings; can override price', async () => {
  const s = getDb().sessions.find(
    (x) => x.status === 'scheduled' && new Date(x.starts_at) > Date.now() && getDb().bookings.filter((b) => b.session_id === x.id && b.status === 'booked').length >= 2,
  );
  await rejects(admin.updateSession(s.id, { capacity: 1 }), 409);
  assert.equal((await admin.updateSession(s.id, { credit_override: 5 })).credits, 5);
});

test('admin creates a class for an instructor by email', async () => {
  const c = await admin.createClass(boss(), {
    title: 'Dance Cardio', discipline: 'Dance', level: 'Beginner', location_id: 2,
    duration_min: 45, capacity: 20, credit_cost: 2, instructor_email: 'priya@studiopass.test',
  });
  assert.equal(c.instructor.email, 'priya@studiopass.test');
  assert.equal(c.created_by, 'admin@studiopass.test');
  await rejects(admin.createClass(boss(), { ...c, location_id: 2, instructor_email: 'taylor@example.test' }), 400);
});

test('instructor marks attendance only on their own sessions', async () => {
  const me = maya();
  const mine = new Set(getDb().classes.filter((c) => c.instructor_email === me.email).map((c) => c.id));
  const b = getDb().bookings.find((x) => {
    const s = byId('sessions', x.session_id);
    return mine.has(s.class_id) && new Date(s.starts_at) < Date.now() && x.status !== 'cancelled' && s.status === 'scheduled';
  });
  await instructor.markAttendance(me, b.id, 'no_show');
  assert.equal(byId('bookings', b.id).status, 'no_show');
  const notMine = getDb().bookings.find((x) => !mine.has(byId('sessions', x.session_id).class_id));
  await rejects(instructor.markAttendance(me, notMine.id, 'attended'), 403);
});

test('ZIP tags: valid lists saved, bad ZIPs rejected', async () => {
  assert.deepEqual((await admin.updateLocation(1, { zip_tags: '11211, 11222' })).zip_tags, ['11211', '11222']);
  await rejects(admin.updateInstructor('maya@studiopass.test', { zip_tags: ['abc'] }), 400);
});

// --- Reports --------------------------------------------------------------------

test('reports: totals match the raw data', async () => {
  const r = await reports.getReports({ days: 'all' });
  const db = getDb();
  const purchases = db.credit_transactions.filter((t) => t.type === 'purchase');
  assert.equal(r.summary.revenue_usd, purchases.reduce((n, t) => n + t.amount_usd, 0));
  assert.equal(r.summary.credits_sold, purchases.reduce((n, t) => n + t.delta, 0));
  assert.equal(r.summary.unused_credits, db.users.filter((u) => u.role === 'member').reduce((n, u) => n + u.credits, 0));
  // Every breakdown adds back up to the headline numbers.
  const sum = (rows, k) => rows.reduce((n, x) => n + x[k], 0);
  assert.equal(sum(r.classes, 'taken'), r.summary.visits);
  assert.equal(sum(r.studios, 'credits'), r.summary.credits_earned);
  assert.equal(sum(r.instructors, 'sessions'), r.summary.sessions_held);
  assert.equal(sum(r.member_zips, 'visits'), r.summary.visits);
  assert.equal(sum(r.packages, 'revenue_usd'), r.summary.revenue_usd);
  assert.ok(r.summary.fill_pct > 0 && r.summary.fill_pct <= 100);
});

test('reports: a new purchase shows up as revenue; bad periods are rejected', async () => {
  const before = (await reports.getReports({ days: '7' })).summary.revenue_usd;
  await credits.purchasePackage(casey(), 2);
  const after = await reports.getReports({ days: '7' });
  assert.equal(after.summary.revenue_usd, before + 100);
  assert.equal(after.packages.find((p) => p.package_id === 2).sold, 1);
  await rejects(reports.getReports({ days: '5' }), 400);
});

test('reports: ZIPs with members but no studio are called out', async () => {
  await auth.signup({ name: 'Far Away', email: 'far@x.test', password: 'pass', zip: '90210' });
  const z = (await reports.getReports({ days: '30' })).member_zips.find((x) => x.zip === '90210');
  assert.deepEqual(z.served_by, []);
});

test('pricing rule: >80% full three sessions in a row suggests +1 credit', () => {
  assert.deepEqual(pricingSignal([0.5, 0.85, 0.9, 1]), { action: 'raise', change: 1 });
  assert.equal(pricingSignal([0.9, 0.8, 0.95]).action, 'keep'); // exactly 80% is not "more than"
  assert.equal(pricingSignal([0.3, 0.2, 0.1]).action, 'lower');
  assert.equal(pricingSignal([0.9, 0.9]).action, 'wait');
});
