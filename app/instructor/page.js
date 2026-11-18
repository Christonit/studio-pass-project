'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAttempt, useToast } from '@/components/Providers';
import { CapacityBar, DayLabel, Empty, Loading, PageHead, StatusBadge } from '@/components/ui';
import { api } from '@/lib/client/api';
import { fmtDateTime, fmtTime, groupByDay } from '@/lib/client/format';

export default function RostersPage() {
  const attempt = useAttempt();
  const toast = useToast();
  const [sessions, setSessions] = useState(null);
  const [selected, setSelected] = useState(null);
  const [roster, setRoster] = useState(null);
  const rosterRef = useRef(null);

  const loadSessions = useCallback(async () => {
    const data = await attempt(() => api('/instructor/sessions'));
    if (!data) return;
    setSessions(data);
    // First visit: open the latest class that still needs attendance, else the next one.
    setSelected((cur) => {
      if (cur) return cur;
      const needs = data.filter((s) => s.needs_attendance).at(-1);
      const next = data.find((s) => new Date(s.starts_at) > new Date() && s.status === 'scheduled');
      return (needs ?? next)?.id ?? null;
    });
  }, [attempt]);

  const loadRoster = useCallback(async () => {
    if (!selected) return;
    const data = await attempt(() => api(`/instructor/sessions/${selected}/roster`));
    if (data) setRoster(data);
  }, [selected, attempt]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);
  useEffect(() => {
    loadRoster();
  }, [loadRoster]);

  function pick(id) {
    setSelected(id);
    if (window.innerWidth < 900) rosterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function mark(bookingId, status) {
    const res = await attempt(() => api(`/instructor/bookings/${bookingId}/attendance`, { method: 'POST', body: { status } }));
    if (!res) return;
    toast('Attendance saved.', 'success');
    loadRoster();
    loadSessions();
  }

  const now = new Date();
  const upcoming = sessions?.filter((s) => new Date(s.starts_at) > now) ?? [];
  const past = sessions?.filter((s) => new Date(s.starts_at) <= now).reverse() ?? [];

  const section = (title, list) =>
    list.length ? (
      <>
        <h2 style={{ margin: '8px 0 12px' }}>{title}</h2>
        {groupByDay(list).map((day) => (
          <div className="day-group" style={{ marginTop: 16 }} key={day[0].id}>
            <h3 className="day-title">
              <DayLabel iso={day[0].starts_at} />
            </h3>
            <div className="demo-users">
              {day.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`demo-user list-item ${s.id === selected ? 'selected' : ''}`}
                  onClick={() => pick(s.id)}
                >
                  <span className="info">
                    <strong>{s.class.title}</strong>
                    <span>
                      {fmtTime(s.starts_at)} · {s.location.neighborhood} · {s.booked}/{s.capacity} booked
                    </span>
                  </span>
                  {s.status === 'cancelled' ? (
                    <StatusBadge status="cancelled" />
                  ) : s.needs_attendance ? (
                    <span className="badge warn">Take attendance</span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ))}
      </>
    ) : null;

  return (
    <>
      <PageHead
        eyebrow="Instructor"
        title="Rosters & attendance"
        actions={
          <Link className="btn btn-accent" href="/instructor/proposals">
            Propose a class
          </Link>
        }
      >
        Your classes from the last 7 days and everything coming up. Pick a session to see who&apos;s booked and mark attendance.
      </PageHead>
      <div className="split">
        <div>
          {!sessions ? (
            <Loading />
          ) : !sessions.length ? (
            <Empty title="No sessions yet">Once a proposal is approved, its sessions appear here.</Empty>
          ) : (
            <>
              {section('Upcoming', upcoming)}
              <div style={{ height: 24 }} />
              {section('Last 7 days', past)}
            </>
          )}
        </div>
        <div className="sticky" ref={rosterRef}>
          {!selected ? (
            <Empty title="Pick a session">Its roster will show here.</Empty>
          ) : !roster ? (
            <Loading />
          ) : (
            <Roster data={roster} onMark={mark} />
          )}
        </div>
      </div>
    </>
  );
}

function Roster({ data: { session: s, attendance_open, roster }, onMark }) {
  const active = roster.filter((r) => r.status !== 'cancelled');
  const count = (st) => active.filter((r) => r.status === st).length;
  return (
    <div className="card">
      <div className="card-head" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2>{s.class.title}</h2>
          <p className="muted small" style={{ marginTop: 4 }}>
            {fmtDateTime(s.starts_at)} · {s.location.name}
          </p>
        </div>
        <StatusBadge status={s.status === 'scheduled' && new Date(s.starts_at) <= new Date() ? 'done' : s.status} />
      </div>
      {s.status === 'cancelled' ? (
        <div className="notice danger small">Cancelled: {s.cancel_reason}</div>
      ) : (
        <CapacityBar session={s} />
      )}
      <div className="row small muted" style={{ margin: '14px 0' }}>
        <span className="badge teal">{count('booked')} booked</span>
        <span className="badge success">{count('attended')} attended</span>
        <span className="badge danger">{count('no_show')} no-show</span>
      </div>
      {!attendance_open && s.status === 'scheduled' && (
        <div className="notice small" style={{ marginBottom: 12 }}>
          Attendance opens an hour before class.
        </div>
      )}
      {!roster.length ? (
        <Empty title="Nobody booked yet" />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Status</th>
                <th className="num">Attendance</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((r) => (
                <tr key={r.booking_id}>
                  <td>
                    <strong>{r.member.name}</strong>
                    <br />
                    <span className="muted small">{r.member.email}</span>
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="num">
                    {attendance_open && r.status !== 'cancelled' ? (
                      <div className="row" style={{ gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                        {/* Clicking the active choice again resets the member to "booked". */}
                        <button
                          className={`btn btn-sm ${r.status === 'attended' ? 'btn-primary' : 'btn-ghost'}`}
                          aria-pressed={r.status === 'attended'}
                          onClick={() => onMark(r.booking_id, r.status === 'attended' ? 'booked' : 'attended')}
                        >
                          Here
                        </button>
                        <button
                          className={`btn btn-sm ${r.status === 'no_show' ? 'btn-danger' : 'btn-ghost'}`}
                          aria-pressed={r.status === 'no_show'}
                          onClick={() => onMark(r.booking_id, r.status === 'no_show' ? 'booked' : 'no_show')}
                        >
                          No-show
                        </button>
                      </div>
                    ) : (
                      <span className="muted small">–</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
