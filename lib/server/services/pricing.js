// Credit pricing.
//
// Rule-based dynamic pricing (from the deck): if a class is more than 80% full
// for three sessions in a row, raise its price by one credit. The mirror rule
// flags classes that stay under 40% full as candidates for a lower price.
// For now the rules only *suggest* (the admin Reports page shows the flags);
// applying one should write sessions.credit_override so admins can see and
// undo it.

export const PRICING_RULES = {
  hotFill: 0.8, // "more than 80% full"
  coldFill: 0.4, // "less than 40% full"
  streak: 3, // sessions in a row
  step: 1, // credits to add or take off
};

export function effectivePrice(session, cls) {
  return session.credit_override ?? cls.credit_cost;
}

/**
 * Looks at a class's fill rates (0–1), oldest first, and suggests a price move
 * based on the most recent PRICING_RULES.streak sessions.
 * Returns { action: 'raise' | 'lower' | 'keep' | 'wait', change }.
 */
export function pricingSignal(fills) {
  const { hotFill, coldFill, streak, step } = PRICING_RULES;
  if (fills.length < streak) return { action: 'wait', change: 0 };
  const recent = fills.slice(-streak);
  if (recent.every((f) => f > hotFill)) return { action: 'raise', change: step };
  if (recent.every((f) => f < coldFill)) return { action: 'lower', change: -step };
  return { action: 'keep', change: 0 };
}
