export const credits = (n) => `${n} credit${n === 1 ? '' : 's'}`;
export const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
export const fmtDate = (iso) => new Date(iso).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
export const fmtDateTime = (iso) => `${fmtDate(iso)}, ${fmtTime(iso)}`;
export const fmtMoney = (n) => (n === null || n === undefined ? '' : `$${Number(n).toFixed(2)}`);
export const hoursUntil = (iso) => (new Date(iso) - Date.now()) / 3600_000;
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : /(s|sh|ch|x)$/.test(word) ? 'es' : 's'}`;

/** Splits items into arrays of the same calendar day (keeps order). */
export function groupByDay(items, getIso = (x) => x.starts_at) {
  const groups = new Map();
  for (const item of items) {
    const key = new Date(getIso(item)).toDateString();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups.values()];
}

/** { prefix: 'Today' | 'Tomorrow' | 'Yesterday' | null, date: 'Tuesday, Nov 17' } */
export function dayParts(iso) {
  const d = new Date(iso);
  const offset = (n) => {
    const x = new Date();
    x.setDate(x.getDate() + n);
    return x.toDateString();
  };
  const prefix = { [offset(0)]: 'Today', [offset(1)]: 'Tomorrow', [offset(-1)]: 'Yesterday' }[d.toDateString()] ?? null;
  return { prefix, date: d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }) };
}

/** ISO string → value for <input type="datetime-local"> in local time. */
export function toLocalInput(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value (local time) → ISO string. */
export const fromLocalInput = (value) => (value ? new Date(value).toISOString() : '');
