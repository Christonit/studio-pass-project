// Admin reports: revenue, class utilization, instructors, studios, member ZIP
// codes and pricing flags. Everything is computed from the same tables the
// rest of the app writes, so the numbers always match the live data.
//
// Definitions used throughout:
// - A session is "held" when it was scheduled (not cancelled) and has started.
// - A spot is taken by a booking that is booked, attended or a no-show.
// - Fill = spots taken / capacity, summed over sessions (weighted, not averaged).
// - Credits earned = credits members paid for bookings minus what was refunded
//   (late cancellations keep their credits, so they count as earned).
import { getDb, userByEmail } from '../db/store.js';
import { clock } from '../config.js';
import { badRequest } from '../errors.js';
import { ACTIVE_BOOKING } from './present.js';
import { matchesZip } from './catalog.js';
import { PRICING_RULES, pricingSignal } from './pricing.js';

export const REPORT_PERIODS = { 7: 'Last 7 days', 30: 'Last 30 days', 90: 'Last 90 days', all: 'All time' };

const DAY = 86400_000;
const pct = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : null);
const money = (n) => Math.round(n * 100) / 100;

function groupBy(rows, key) {
  const out = new Map();
  for (const row of rows) {
    const k = key(row);
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(row);
  }
  return out;
}

/** Totals for a list of per-session stats. */
function totals(stats) {
  const t = { sessions: stats.length, taken: 0, capacity: 0, attended: 0, no_show: 0, unmarked: 0, late_cancels: 0, credits: 0 };
  for (const s of stats) for (const k of Object.keys(t)) if (k !== 'sessions') t[k] += s[k];
  return {
    ...t,
    fill_pct: pct(t.taken, t.capacity),
    no_show_pct: pct(t.no_show, t.attended + t.no_show),
  };
}

export async function getReports({ days = '30' } = {}) {
  const period = String(days);
  if (!(period in REPORT_PERIODS)) throw badRequest('Period must be 7, 30, 90 or all.');

  const db = getDb();
  const now = clock.now();
  const from = period === 'all' ? null : new Date(now.getTime() - Number(period) * DAY);
  const inPeriod = (iso) => {
    const d = new Date(iso);
    return d <= now && (!from || d >= from);
  };

  const classes = new Map(db.classes.map((c) => [c.id, c]));
  const locations = new Map(db.locations.map((l) => [l.id, l]));
  const bookingsBySession = groupBy(db.bookings, (b) => b.session_id);

  // --- One row of numbers per held session -----------------------------------
  const sessionStats = (s) => {
    const all = bookingsBySession.get(s.id) ?? [];
    const taken = all.filter((b) => ACTIVE_BOOKING.has(b.status));
    return {
      session: s,
      cls: classes.get(s.class_id),
      capacity: s.capacity,
      taken: taken.length,
      attended: taken.filter((b) => b.status === 'attended').length,
      no_show: taken.filter((b) => b.status === 'no_show').length,
      unmarked: taken.filter((b) => b.status === 'booked').length,
      late_cancels: all.filter((b) => b.status === 'cancelled' && b.refunded_credits < b.credits_spent).length,
      credits: all.reduce((n, b) => n + b.credits_spent - b.refunded_credits, 0),
      members: taken.map((b) => b.member_email),
    };
  };
  const isHeld = (s) => s.status === 'scheduled' && new Date(s.starts_at) <= now;
  const held = db.sessions.filter((s) => isHeld(s) && inPeriod(s.starts_at)).map(sessionStats);
  const cancelledSessions = db.sessions.filter((s) => s.status === 'cancelled' && inPeriod(s.starts_at)).length;

  // --- Revenue (simulated credit-package sales) ------------------------------
  const purchases = db.credit_transactions.filter((t) => t.type === 'purchase' && inPeriod(t.created_at));
  const packageNames = new Map(db.credit_packages.map((p) => [p.id, p.name]));
  const packages = [...groupBy(purchases, (t) => t.package_id)]
    .map(([id, rows]) => ({
      package_id: id,
      name: packageNames.get(id) ?? 'Other',
      sold: rows.length,
      credits: rows.reduce((n, t) => n + t.delta, 0),
      revenue_usd: money(rows.reduce((n, t) => n + (t.amount_usd ?? 0), 0)),
    }))
    .sort((a, b) => b.revenue_usd - a.revenue_usd);

  // Credits members hold but haven't spent yet: a liability for the studio.
  const allPurchases = db.credit_transactions.filter((t) => t.type === 'purchase');
  const soldCredits = allPurchases.reduce((n, t) => n + t.delta, 0);
  const soldUsd = allPurchases.reduce((n, t) => n + (t.amount_usd ?? 0), 0);
  const avgCreditUsd = soldCredits ? soldUsd / soldCredits : 0;
  const unusedCredits = db.users.filter((u) => u.role === 'member').reduce((n, u) => n + (u.credits ?? 0), 0);

  // --- Classes, with the pricing rule applied to each ------------------------
  const heldByClass = groupBy(held, (s) => s.cls.id);
  const recentFills = (c) =>
    db.sessions
      .filter((s) => s.class_id === c.id && isHeld(s))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      .map((s) => sessionStats(s))
      .map((s) => s.taken / s.capacity);
  const classRows = db.classes
    .filter((c) => c.status === 'active' || heldByClass.has(c.id))
    .map((c) => {
      const fills = recentFills(c);
      const loc = locations.get(c.location_id);
      return {
        class_id: c.id,
        title: c.title,
        discipline: c.discipline,
        status: c.status,
        instructor: userByEmail(c.instructor_email)?.name ?? c.instructor_email,
        location: loc?.neighborhood || loc?.name || '',
        credit_cost: c.credit_cost,
        ...totals(heldByClass.get(c.id) ?? []),
        last_fills_pct: fills.slice(-PRICING_RULES.streak).map((f) => Math.round(f * 100)),
        pricing: pricingSignal(fills),
      };
    })
    .sort((a, b) => (b.fill_pct ?? -1) - (a.fill_pct ?? -1) || a.title.localeCompare(b.title));

  // --- Instructors and studios ------------------------------------------------
  const instructors = [...groupBy(held, (s) => s.cls.instructor_email)]
    .map(([email, stats]) => ({ email, name: userByEmail(email)?.name ?? email, ...totals(stats) }))
    .sort((a, b) => b.fill_pct - a.fill_pct);

  const studios = db.locations
    .map((l) => ({
      location_id: l.id,
      name: l.neighborhood || l.name,
      zip: l.zip,
      ...totals(held.filter((s) => s.cls.location_id === l.id)),
    }))
    .sort((a, b) => b.credits - a.credits);

  // --- Demand by member home ZIP ---------------------------------------------
  const members = db.users.filter((u) => u.role === 'member');
  const visitsByMember = new Map();
  for (const s of held) for (const email of s.members) visitsByMember.set(email, (visitsByMember.get(email) ?? 0) + 1);
  const totalVisits = held.reduce((n, s) => n + s.taken, 0);
  const memberZips = [...groupBy(members, (u) => u.zip)]
    .map(([zip, people]) => {
      const visits = people.reduce((n, u) => n + (visitsByMember.get(u.email) ?? 0), 0);
      return {
        zip,
        members: people.length,
        visits,
        share_pct: pct(visits, totalVisits),
        served_by: db.locations.filter((l) => matchesZip(l, zip)).map((l) => l.neighborhood || l.name),
      };
    })
    .sort((a, b) => b.visits - a.visits || b.members - a.members || a.zip.localeCompare(b.zip));

  const all = totals(held);
  return {
    period: { key: period, label: REPORT_PERIODS[period], from: from?.toISOString() ?? null, to: now.toISOString() },
    summary: {
      revenue_usd: money(purchases.reduce((n, t) => n + (t.amount_usd ?? 0), 0)),
      packages_sold: purchases.length,
      credits_sold: purchases.reduce((n, t) => n + t.delta, 0),
      sessions_held: all.sessions,
      sessions_cancelled: cancelledSessions,
      visits: all.taken,
      fill_pct: all.fill_pct,
      attended: all.attended,
      no_show: all.no_show,
      unmarked: all.unmarked,
      no_show_pct: all.no_show_pct,
      late_cancels: all.late_cancels,
      credits_earned: all.credits,
      unused_credits: unusedCredits,
      unused_credits_usd: money(unusedCredits * avgCreditUsd),
      members: members.length,
      active_members: visitsByMember.size,
    },
    packages,
    classes: classRows,
    instructors,
    studios,
    member_zips: memberZips,
    pricing_rule: PRICING_RULES,
  };
}
