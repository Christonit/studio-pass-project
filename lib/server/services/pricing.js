// Credit pricing.
// Week 5 TODO: rule-based dynamic pricing. Example rule from the deck: if a
// class is more than 80% full for three sessions in a row, raise its price by
// one credit. Rules should write sessions.credit_override so admins can still
// see and undo them.

export function effectivePrice(session, cls) {
  return session.credit_override ?? cls.credit_cost;
}
