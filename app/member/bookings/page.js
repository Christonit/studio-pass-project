'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/components/AppShell';
import { useAttempt, useDialog, useToast } from '@/components/Providers';
import { DayLabel, DisciplineBadge, Empty, LevelBadge, Loading, PageHead, PriceTag, StatusBadge } from '@/components/ui';
import { api } from '@/lib/client/api';
import { credits, fmtDate, fmtDateTime, fmtTime, groupByDay, hoursUntil } from '@/lib/client/format';

const LATE = 12; // hours; matches RULES.lateCancelHours on the server

const isUpcoming = (b) => b.status === 'booked' && new Date(b.session.starts_at) > new Date();

export default function MyBookingsPage() {
  const { setBalance } = useSession();
  const ask = useDialog();
  const toast = useToast();
  const attempt = useAttempt();
  const [bookings, setBookings] = useState(null);
  const [tab, setTab] = useState('upcoming');

  const load = useCallback(async () => {
    const data = await attempt(() => api('/me/bookings'));
    if (data) setBookings(data);
  }, [attempt]);
  useEffect(() => {
    load();
  }, [load]);

  async function cancel(b) {
    const s = b.session;
    const refund = hoursUntil(s.starts_at) >= LATE;
    const ok = await ask({
      title: `Cancel ${s.class.title}?`,
      body: (
        <>
          <p>
            {fmtDateTime(s.starts_at)} at {s.location.name}.
          </p>
          {refund ? (
            <div className="notice">
              You&apos;ll get <b>{credits(b.credits_spent)}</b> back.
            </div>
          ) : (
            <div className="notice warn">
              This is a late cancellation (under {LATE} hours). Your {credits(b.credits_spent)} will <b>not</b> be refunded.
            </div>
          )}
        </>
      ),
      confirm: 'Cancel booking',
      cancel: 'Keep it',
      kind: 'danger',
    });
    if (!ok) return;
    const res = await attempt(() => api(`/me/bookings/${b.id}/cancel`, { method: 'POST' }));
    if (!res) return;
    setBalance(res.balance);
    toast(res.refunded ? `Cancelled. ${credits(res.refunded)} refunded.` : 'Cancelled (late, no refund).', 'success');
    load();
  }

  async function change(b) {
    const s = b.session;
    const others = (await attempt(() => api(`/sessions?class_id=${s.class.id}`))) ?? [];
    const choices = others.filter((o) => o.id !== s.id);
    const picked = await ask({
      title: 'Change booking',
      wide: true,
      confirm: choices.length ? 'Move my booking' : null,
      body: choices.length ? (
        <>
          <p className="muted small">
            Pick another {s.class.title} session. Your {credits(b.credits_spent)} come back in full and the new session&apos;s
            price is charged.
          </p>
          <div className="option-list">
            {choices.map((o) => {
              const blocked = o.spots_left === 0 || Boolean(o.my_booking);
              return (
                <label key={o.id} className={`option ${blocked ? 'disabled' : ''}`}>
                  <input type="radio" name="session_id" value={o.id} required disabled={blocked} />
                  <span style={{ flex: 1 }}>
                    <strong>{fmtDateTime(o.starts_at)}</strong>
                    <br />
                    <span className="muted small">
                      {o.my_booking ? 'Already booked' : o.spots_left === 0 ? 'Full' : `${o.spots_left} spots left`}
                    </span>
                  </span>
                  <PriceTag session={o} />
                </label>
              );
            })}
          </div>
        </>
      ) : (
        <p>There are no other upcoming {s.class.title} sessions. You can cancel and book a different class instead.</p>
      ),
    });
    if (!picked?.session_id) return;
    const res = await attempt(() =>
      api(`/me/bookings/${b.id}/change`, { method: 'POST', body: { session_id: Number(picked.session_id) } }),
    );
    if (!res) return;
    setBalance(res.balance);
    toast(`Moved to ${fmtDateTime(res.booking.session.starts_at)}.`, 'success');
    load();
  }

  const head = (
    <PageHead
      eyebrow="Reservations"
      title="My bookings"
      actions={
        <Link className="btn btn-primary" href="/member">
          Find a class
        </Link>
      }
    >
      Change or cancel up to {LATE} hours before class for a full refund. Later cancellations keep the credits.
    </PageHead>
  );
  if (!bookings) return (
    <>
      {head}
      <Loading />
    </>
  );

  const upcoming = bookings.filter(isUpcoming);
  const history = bookings.filter((b) => !isUpcoming(b)).reverse();
  const list = tab === 'upcoming' ? upcoming : history;

  return (
    <>
      {head}
      <div className="tabs" role="tablist">
        <button className={tab === 'upcoming' ? 'active' : ''} onClick={() => setTab('upcoming')}>
          Upcoming<span className="count">{upcoming.length}</span>
        </button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
          History<span className="count">{history.length}</span>
        </button>
      </div>

      {!list.length ? (
        tab === 'upcoming' ? (
          <Empty title="No upcoming classes">
            <p style={{ marginTop: 12 }}>
              <Link className="btn btn-primary btn-sm" href="/member">
                Browse classes
              </Link>
            </p>
          </Empty>
        ) : (
          <Empty title="Nothing here yet">Past and cancelled bookings will show up here.</Empty>
        )
      ) : (
        groupByDay(list, (b) => b.session.starts_at).map((day) => (
          <section className="day-group" key={day[0].id}>
            <h2 className="day-title">
              <DayLabel iso={day[0].session.starts_at} />
            </h2>
            <div className="session-list">
              {day.map((b) => (
                <BookingRow key={b.id} b={b} onCancel={() => cancel(b)} onChange={() => change(b)} />
              ))}
            </div>
          </section>
        ))
      )}
    </>
  );
}

function BookingRow({ b, onCancel, onChange }) {
  const s = b.session;
  const upcoming = isUpcoming(b);
  const late = upcoming && hoursUntil(s.starts_at) < LATE;
  return (
    <article className={`session ${upcoming ? 'is-mine' : ''} ${b.status === 'cancelled' ? 'is-cancelled' : ''}`}>
      <div className="when">
        <strong>{fmtTime(s.starts_at)}</strong>
        <span>{s.class.duration_min} min</span>
      </div>
      <div className="what">
        <h3>{s.class.title}</h3>
        <div className="row" style={{ gap: 6 }}>
          <StatusBadge status={b.status} />
          <DisciplineBadge discipline={s.class.discipline} />
          <LevelBadge level={s.class.level} />
        </div>
        <div className="meta">
          <span>with {s.instructor.name}</span>
          <span>{s.location.name}</span>
          <span>Booked {fmtDate(b.created_at)}</span>
        </div>
        {s.status === 'cancelled' ? (
          <div className="notice danger small" style={{ marginTop: 10 }}>
            Cancelled by the studio: {s.cancel_reason}
          </div>
        ) : late ? (
          <div className="notice warn small" style={{ marginTop: 10 }}>
            Less than {LATE} hours to go: cancelling now will not refund your credits.
          </div>
        ) : null}
      </div>
      <div className="act">
        {b.status === 'cancelled' ? (
          <span className="muted small nowrap">
            {b.refunded_credits ? `Refunded ${credits(b.refunded_credits)}` : 'No refund (late)'}
          </span>
        ) : (
          <span className="price">{credits(b.credits_spent)}</span>
        )}
        {upcoming && (
          <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={onChange} disabled={late} title={late ? 'Too close to class to change' : undefined}>
              Change
            </button>
            <button className="btn btn-danger-ghost btn-sm" onClick={onCancel}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
