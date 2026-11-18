import { getDb, insert, byId, save } from '../db/store.js';
import { clock } from '../config.js';
import { badRequest, notFound } from '../errors.js';

/** Changes a member's balance and writes the matching ledger row. Caller saves. */
export function recordTransaction(member, delta, type, extra = {}) {
  if (member.credits + delta < 0) throw badRequest('Balance cannot go below zero.');
  member.credits += delta;
  return insert('credit_transactions', {
    member_email: member.email,
    delta,
    type,
    package_id: extra.package_id ?? null,
    booking_id: extra.booking_id ?? null,
    amount_usd: extra.amount_usd ?? null,
    note: extra.note ?? '',
    created_at: clock.now().toISOString(),
  });
}

export async function listPackages() {
  return getDb()
    .credit_packages.filter((p) => p.active)
    .map((p) => ({ ...p, price_per_credit: Math.round((p.price_usd / p.credits) * 100) / 100 }));
}

/** Simulated checkout: no payment provider, the credits are just added. */
export async function purchasePackage(member, packageId) {
  const pkg = byId('credit_packages', packageId);
  if (!pkg || !pkg.active) throw notFound('Credit package');
  const tx = recordTransaction(member, pkg.credits, 'purchase', {
    package_id: pkg.id,
    amount_usd: pkg.price_usd,
    note: `Bought ${pkg.name} (simulated payment)`,
  });
  save();
  return { balance: member.credits, transaction: tx };
}

export async function getLedger(member) {
  const rows = getDb()
    .credit_transactions.filter((t) => t.member_email === member.email)
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
  return { balance: member.credits, transactions: rows };
}
