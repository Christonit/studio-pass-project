// Small presentational pieces shared by the pages.
import { credits, dayParts } from '@/lib/client/format';

const LEVEL_KIND = { Beginner: 'success', Intermediate: 'warn', Advanced: 'danger' };
export const LevelBadge = ({ level }) => <span className={`badge ${LEVEL_KIND[level] ?? ''}`}>{level}</span>;
export const DisciplineBadge = ({ discipline }) => <span className="badge teal">{discipline}</span>;

const STATUS = {
  booked: ['Booked', 'teal'],
  attended: ['Attended', 'success'],
  no_show: ['No-show', 'danger'],
  cancelled: ['Cancelled', ''],
  pending: ['Pending review', 'warn'],
  approved: ['Approved', 'success'],
  rejected: ['Rejected', 'danger'],
  scheduled: ['Scheduled', 'teal'],
  active: ['Active', 'success'],
  archived: ['Archived', ''],
  done: ['Done', ''],
};
export function StatusBadge({ status }) {
  const [label, kind] = STATUS[status] ?? [status, ''];
  return <span className={`badge ${kind}`}>{label}</span>;
}

export function CapacityBar({ session: s }) {
  const pct = Math.min(100, Math.round((s.booked / s.capacity) * 100));
  return (
    <div className={`capacity ${pct >= 80 ? 'hot' : ''}`}>
      <div className="bar" role="img" aria-label={`${pct}% full`}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <span>{s.spots_left === 0 ? 'Full' : `${s.spots_left} of ${s.capacity} spots left`}</span>
    </div>
  );
}

export function PriceTag({ session: s }) {
  const overridden = s.credit_override !== null && s.credit_override !== undefined && s.credit_override !== s.base_credits;
  return (
    <span className="price">
      {overridden && <s>{s.base_credits}</s>}
      {credits(s.credits)}
    </span>
  );
}

export function DayLabel({ iso }) {
  const { prefix, date } = dayParts(iso);
  return prefix ? (
    <>
      <b>{prefix}</b> · {date}
    </>
  ) : (
    <b>{date}</b>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children}
    </div>
  );
}

export function PageHead({ eyebrow, title, children, actions }) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {actions}
    </div>
  );
}

/** <option>s from a list of values or [value, label] pairs. */
export function Options({ list, placeholder }) {
  return (
    <>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {list.map((o) => {
        const [value, label] = Array.isArray(o) ? o : [o, o];
        return (
          <option key={value} value={value}>
            {label}
          </option>
        );
      })}
    </>
  );
}

export const Loading = ({ children = 'Loading…' }) => <p className="loading">{children}</p>;
