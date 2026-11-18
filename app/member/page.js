'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/components/AppShell';
import { useAttempt, useDialog, useToast } from '@/components/Providers';
import {
  CapacityBar, DayLabel, DisciplineBadge, Empty, LevelBadge, Loading, Options, PageHead, PriceTag,
} from '@/components/ui';
import { api } from '@/lib/client/api';
import { credits, fmtDateTime, fmtTime, groupByDay } from '@/lib/client/format';

const DEFAULT_FILTERS = { q: '', discipline: '', level: '', zip: '', days: '7' };
const WHEN = [['1', 'Next 24 hours'], ['7', 'Next 7 days'], ['14', 'Next 2 weeks'], ['', 'Everything']];

export default function FindClassesPage() {
  const { user, setBalance } = useSession();
  const ask = useDialog();
  const toast = useToast();
  const attempt = useAttempt();
  const [meta, setMeta] = useState(null);
  const [filters, setFilters] = useState(null);
  const [sessions, setSessions] = useState(null);

  // Filters start from the URL so a filtered list can be shared.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters(Object.fromEntries(Object.entries(DEFAULT_FILTERS).map(([k, v]) => [k, params.get(k) ?? v])));
    attempt(() => api('/meta')).then(setMeta);
  }, [attempt]);

  const load = useCallback(async () => {
    if (!filters) return;
    const zipOk = !filters.zip || /^\d{5}$/.test(filters.zip);
    const qs = new URLSearchParams(Object.entries(filters).filter(([k, v]) => v && (k !== 'zip' || zipOk)));
    window.history.replaceState(null, '', `?${qs}`);
    const data = await attempt(() => api(`/sessions?${qs}`));
    if (data) setSessions(data);
  }, [filters, attempt]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));

  async function book(sessionId) {
    const s = await attempt(() => api(`/sessions/${sessionId}`));
    if (!s) return;
    const after = user.credits - s.credits;
    if (after < 0) {
      const go = await ask({
        title: 'Not enough credits',
        body: (
          <p>
            {s.class.title} costs <b>{credits(s.credits)}</b> and you have <b>{credits(user.credits)}</b>.
          </p>
        ),
        confirm: 'Buy credits',
        kind: 'accent',
      });
      if (go) window.location.href = '/member/credits';
      return;
    }
    const ok = await ask({
      title: `Book ${s.class.title}?`,
      body: (
        <>
          <dl className="kv">
            <dt>When</dt>
            <dd>
              {fmtDateTime(s.starts_at)} · {s.class.duration_min} min
            </dd>
            <dt>Where</dt>
            <dd>
              {s.location.name}
              <br />
              <span className="muted small">{s.location.address}</span>
            </dd>
            <dt>Instructor</dt>
            <dd>{s.instructor.name}</dd>
            <dt>Price</dt>
            <dd>
              {credits(s.credits)} · balance after: {credits(after)}
            </dd>
          </dl>
          <p className="muted small">Cancel at least {meta?.rules.lateCancelHours ?? 12} hours before class for a full refund.</p>
        </>
      ),
      confirm: `Book for ${credits(s.credits)}`,
    });
    if (!ok) return;
    const res = await attempt(() => api('/me/bookings', { method: 'POST', body: { session_id: s.id } }));
    if (!res) return;
    setBalance(res.balance);
    toast(`Booked ${s.class.title}, ${fmtDateTime(s.starts_at)}.`, 'success');
    load();
  }

  if (!filters || !meta) return <Loading />;

  return (
    <>
      <PageHead eyebrow="Book a class" title="Find your next class">
        Filter by discipline, level and ZIP code. Book with credits, and cancel up to {meta.rules.lateCancelHours} hours
        before class for a full refund.
      </PageHead>

      <form className="card filters" style={{ marginBottom: 24 }} onSubmit={(e) => e.preventDefault()}>
        <label className="field full">
          <span>Search</span>
          <input className="input" type="search" placeholder="Class, instructor…" value={filters.q} onChange={set('q')} />
        </label>
        <label className="field">
          <span>Discipline</span>
          <select className="select" value={filters.discipline} onChange={set('discipline')}>
            <Options list={meta.disciplines} placeholder="All" />
          </select>
        </label>
        <label className="field">
          <span>Level</span>
          <select className="select" value={filters.level} onChange={set('level')}>
            <Options list={meta.levels} placeholder="All" />
          </select>
        </label>
        <label className="field">
          <span>ZIP code</span>
          <input
            className="input"
            inputMode="numeric"
            maxLength={5}
            placeholder={`e.g. ${user.zip}`}
            list="zip-list"
            value={filters.zip}
            onChange={set('zip')}
          />
        </label>
        <label className="field">
          <span>When</span>
          <select className="select" value={filters.days} onChange={set('days')}>
            <Options list={WHEN} />
          </select>
        </label>
        <button type="button" className="btn btn-ghost" onClick={() => setFilters(DEFAULT_FILTERS)}>
          Clear
        </button>
        <datalist id="zip-list">
          {[...new Set(meta.locations.flatMap((l) => [l.zip, ...l.zip_tags]))].map((z) => (
            <option key={z} value={z} />
          ))}
        </datalist>
      </form>

      {!sessions ? (
        <Loading>Loading classes…</Loading>
      ) : !sessions.length ? (
        <Empty title="No classes match">Try another ZIP code, level or a longer date range.</Empty>
      ) : (
        <>
          <p className="muted small" style={{ marginBottom: 12 }}>
            {sessions.length} {sessions.length === 1 ? 'class' : 'classes'} found
          </p>
          {groupByDay(sessions).map((day) => (
            <section className="day-group" key={day[0].starts_at}>
              <h2 className="day-title">
                <DayLabel iso={day[0].starts_at} />
              </h2>
              <div className="session-list">
                {day.map((s) => (
                  <SessionRow key={s.id} s={s} canAfford={user.credits >= s.credits} onBook={() => book(s.id)} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </>
  );
}

function SessionRow({ s, canAfford, onBook }) {
  let action;
  if (s.my_booking) {
    action = (
      <Link className="btn btn-ghost btn-sm" href="/member/bookings">
        ✓ Booked
      </Link>
    );
  } else if (s.spots_left === 0) {
    action = (
      <button className="btn btn-ghost btn-sm" disabled>
        Full
      </button>
    );
  } else {
    action = (
      <button className={`btn btn-sm ${canAfford ? 'btn-primary' : 'btn-ghost'}`} onClick={onBook}>
        Book
      </button>
    );
  }
  return (
    <article className={`session ${s.my_booking ? 'is-mine' : ''}`}>
      <div className="when">
        <strong>{fmtTime(s.starts_at)}</strong>
        <span>{s.class.duration_min} min</span>
      </div>
      <div className="what">
        <h3>{s.class.title}</h3>
        <div className="row" style={{ gap: 6 }}>
          <DisciplineBadge discipline={s.class.discipline} />
          <LevelBadge level={s.class.level} />
        </div>
        <div className="meta">
          <span>with {s.instructor.name}</span>
          <span>
            {s.location.neighborhood} · {s.location.zip}
          </span>
        </div>
        <CapacityBar session={s} />
      </div>
      <div className="act">
        <PriceTag session={s} />
        {action}
      </div>
    </article>
  );
}
