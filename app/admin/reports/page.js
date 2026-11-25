'use client';
import { useEffect, useState } from 'react';
import { useAttempt } from '@/components/Providers';
import { Empty, Loading, PageHead } from '@/components/ui';
import { api } from '@/lib/client/api';
import { fmtDate, plural } from '@/lib/client/format';

const PERIODS = [
  ['7', 'Last 7 days'],
  ['30', 'Last 30 days'],
  ['90', 'Last 90 days'],
  ['all', 'All time'],
];

const usd = (n) => `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const percent = (n) => (n === null || n === undefined ? '—' : `${Math.round(n)}%`);

function Kpi({ label, value, children }) {
  return (
    <div className="card kpi">
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      {children && <span className="kpi-sub">{children}</span>}
    </div>
  );
}

/** A thin single-colour meter; orange once it passes the pricing rule's "hot" line. */
function Meter({ value, hot = 80, label }) {
  if (value === null || value === undefined) return <span className="muted">—</span>;
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className={`meter ${value > hot ? 'hot' : ''}`} title={label}>
      <div className="bar" role="img" aria-label={label ?? `${Math.round(value)}%`}>
        <i style={{ width: `${width}%` }} />
      </div>
      <span>{percent(value)}</span>
    </div>
  );
}

const SIGNALS = {
  raise: ['Raise +1 credit', 'orange'],
  lower: ['Consider −1 credit', 'teal'],
  keep: ['Price looks right', ''],
  wait: ['Needs more sessions', ''],
};
function PricingBadge({ row, rule }) {
  const [label, kind] = SIGNALS[row.pricing.action];
  const recent = row.last_fills_pct.length ? `Last sessions: ${row.last_fills_pct.map((f) => `${f}%`).join(', ')}` : 'No sessions held yet';
  const help =
    row.pricing.action === 'wait'
      ? `${recent}. The rule needs ${rule.streak} sessions in a row.`
      : `${recent}. Rule: over ${rule.hotFill * 100}% full ${rule.streak} times in a row → raise; under ${rule.coldFill * 100}% → lower.`;
  return (
    <span className={`badge ${kind}`} title={help}>
      {label}
    </span>
  );
}

function Section({ title, note, children }) {
  return (
    <section className="report-section">
      <div className="report-section-head">
        <h2>{title}</h2>
        {note && <p className="muted small">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Table({ head, children, empty }) {
  return (
    <div className="card flush">
      <div className="table-wrap">
        <table className="table report-table">
          <thead>
            <tr>
              {head.map(([label, num], i) => (
                <th key={i} className={num ? 'num' : ''}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
        {empty}
      </div>
    </div>
  );
}

export default function AdminReportsPage() {
  const attempt = useAttempt();
  const [days, setDays] = useState('30');
  const [report, setReport] = useState(null);

  useEffect(() => {
    let live = true;
    setReport(null);
    attempt(() => api(`/admin/reports?days=${days}`)).then((r) => live && r && setReport(r));
    return () => {
      live = false;
    };
  }, [days, attempt]);

  const s = report?.summary;
  const flagged = report?.classes.filter((c) => c.pricing.action === 'raise' || c.pricing.action === 'lower') ?? [];
  const maxZipVisits = Math.max(1, ...(report?.member_zips.map((z) => z.visits) ?? [0]));

  return (
    <>
      <PageHead
        eyebrow="Admin"
        title="Reports"
        actions={
          <button className="btn btn-ghost no-print" onClick={() => window.print()}>
            Print / save as PDF
          </button>
        }
      >
        Revenue, class utilization and demand by ZIP code, straight from the booking data. Pick a period to compare.
      </PageHead>

      <div className="tabs no-print" role="tablist" aria-label="Report period">
        {PERIODS.map(([value, label]) => (
          <button key={value} role="tab" aria-selected={days === value} className={days === value ? 'active' : ''} onClick={() => setDays(value)}>
            {label}
          </button>
        ))}
      </div>

      {!report ? (
        <Loading />
      ) : (
        <>
          <p className="muted small report-period">
            {report.period.label}
            {report.period.from ? ` · ${fmtDate(report.period.from)} to ${fmtDate(report.period.to)}` : ` · up to ${fmtDate(report.period.to)}`}
          </p>

          <div className="kpis">
            <Kpi label="Revenue" value={usd(s.revenue_usd)}>
              {plural(s.packages_sold, 'package')} sold · {s.credits_sold} credits
            </Kpi>
            <Kpi label="Average class fill" value={percent(s.fill_pct)}>
              {s.visits} spots taken across {plural(s.sessions_held, 'session')}
            </Kpi>
            <Kpi label="No-show rate" value={percent(s.no_show_pct)}>
              {s.attended} attended · {s.no_show} no-shows
              {s.unmarked ? ` · ${s.unmarked} awaiting attendance` : ''}
            </Kpi>
            <Kpi label="Credits earned" value={s.credits_earned}>
              {s.active_members} of {s.members} members booked
              {s.late_cancels ? ` · ${plural(s.late_cancels, 'late cancel')}` : ''}
            </Kpi>
            <Kpi label="Unused credits" value={s.unused_credits}>
              ≈ {usd(s.unused_credits_usd)} prepaid, not yet booked
            </Kpi>
          </div>
          {s.sessions_cancelled > 0 && (
            <p className="notice warn" style={{ marginTop: 12 }}>
              {plural(s.sessions_cancelled, 'session')} cancelled by the studio in this period (members were refunded).
            </p>
          )}

          <Section
            title="Class utilization & pricing"
            note={`Held sessions in this period. Pricing check: over ${report.pricing_rule.hotFill * 100}% full ${report.pricing_rule.streak} sessions in a row → raise ${report.pricing_rule.step} credit; under ${report.pricing_rule.coldFill * 100}% → consider lowering. Hover a badge for the numbers.`}
          >
            {flagged.length > 0 && (
              <p className="notice" style={{ marginBottom: 12 }}>
                {plural(flagged.length, 'class')} flagged for a price change: {flagged.map((c) => c.title).join(', ')}.
              </p>
            )}
            <Table
              head={[['Class'], ['Sessions', true], ['Fill'], ['Attended', true], ['No-shows', true], ['Credits', true], ['Price', true], ['Pricing check']]}
            >
              {report.classes.map((c) => (
                <tr key={c.class_id}>
                  <td>
                    <strong>{c.title}</strong>
                    {c.status === 'archived' && <span className="badge" style={{ marginLeft: 6 }}>Archived</span>}
                    <br />
                    <span className="muted small">
                      {c.instructor} · {c.location}
                    </span>
                  </td>
                  <td className="num">{c.sessions}</td>
                  <td>
                    <Meter value={c.fill_pct} label={`${c.taken} of ${c.capacity} spots taken`} />
                  </td>
                  <td className="num">{c.attended}</td>
                  <td className="num">{c.no_show}</td>
                  <td className="num">{c.credits}</td>
                  <td className="num">{c.credit_cost}</td>
                  <td>
                    <PricingBadge row={c} rule={report.pricing_rule} />
                  </td>
                </tr>
              ))}
            </Table>
          </Section>

          <div className="report-grid">
            <Section title="Revenue by package" note="Simulated credit-package sales in this period.">
              <Table
                head={[['Package'], ['Sold', true], ['Credits', true], ['Revenue', true]]}
                empty={!report.packages.length && <Empty title="No sales in this period">Try a longer period.</Empty>}
              >
                {report.packages.map((p) => (
                  <tr key={p.package_id}>
                    <td>
                      <strong>{p.name}</strong>
                    </td>
                    <td className="num">{p.sold}</td>
                    <td className="num">{p.credits}</td>
                    <td className="num">{usd(p.revenue_usd)}</td>
                  </tr>
                ))}
                {report.packages.length > 1 && (
                  <tr className="total-row">
                    <td>Total</td>
                    <td className="num">{s.packages_sold}</td>
                    <td className="num">{s.credits_sold}</td>
                    <td className="num">{usd(s.revenue_usd)}</td>
                  </tr>
                )}
              </Table>
            </Section>

            <Section title="Studios" note="Held sessions per location.">
              <Table head={[['Studio'], ['Sessions', true], ['Fill'], ['Credits', true]]}>
                {report.studios.map((l) => (
                  <tr key={l.location_id}>
                    <td>
                      <strong>{l.name}</strong>
                      <br />
                      <span className="muted small">{l.zip}</span>
                    </td>
                    <td className="num">{l.sessions}</td>
                    <td>
                      <Meter value={l.fill_pct} label={`${l.taken} of ${l.capacity} spots taken`} />
                    </td>
                    <td className="num">{l.credits}</td>
                  </tr>
                ))}
              </Table>
            </Section>
          </div>

          <Section
            title="Demand by member ZIP code"
            note="Where members live, how often they came to class in this period, and which studio serves that ZIP."
          >
            <Table head={[['Home ZIP'], ['Members', true], ['Visits', true], ['Share of visits'], ['Served by']]}>
              {report.member_zips.map((z) => (
                <tr key={z.zip}>
                  <td>
                    <strong>{z.zip}</strong>
                  </td>
                  <td className="num">{z.members}</td>
                  <td className="num">{z.visits}</td>
                  <td>
                    <div className="meter share" title={`${z.visits} of all visits`}>
                      <div className="bar" role="img" aria-label={`${percent(z.share_pct)} of visits`}>
                        <i style={{ width: `${(z.visits / maxZipVisits) * 100}%` }} />
                      </div>
                      <span>{percent(z.share_pct)}</span>
                    </div>
                  </td>
                  <td>
                    {z.served_by.length ? (
                      z.served_by.join(', ')
                    ) : (
                      <span className="badge warn" title="Members live here but no studio lists this ZIP">
                        No studio nearby
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          </Section>

          <Section title="Instructors" note="Held sessions per instructor in this period.">
            <Table
              head={[['Instructor'], ['Sessions', true], ['Fill'], ['Attended', true], ['No-show rate', true], ['Credits', true]]}
              empty={!report.instructors.length && <Empty title="No classes held in this period" />}
            >
              {report.instructors.map((i) => (
                <tr key={i.email}>
                  <td>
                    <strong>{i.name}</strong>
                  </td>
                  <td className="num">{i.sessions}</td>
                  <td>
                    <Meter value={i.fill_pct} label={`${i.taken} of ${i.capacity} spots taken`} />
                  </td>
                  <td className="num">{i.attended}</td>
                  <td className="num">{percent(i.no_show_pct)}</td>
                  <td className="num">{i.credits}</td>
                </tr>
              ))}
            </Table>
          </Section>
        </>
      )}
    </>
  );
}
