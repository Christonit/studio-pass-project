'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAttempt, useDialog, useToast } from '@/components/Providers';
import { DisciplineBadge, Empty, LevelBadge, Loading, Options, PageHead, StatusBadge } from '@/components/ui';
import { api } from '@/lib/client/api';
import { credits, fmtDateTime, fromLocalInput, plural, toLocalInput } from '@/lib/client/format';

const num = (v) => (v === '' || v === undefined ? undefined : Number(v));
const classBody = (f) => ({
  ...f,
  location_id: num(f.location_id),
  duration_min: num(f.duration_min),
  capacity: num(f.capacity),
  credit_cost: num(f.credit_cost),
});
const sessionBody = (f) => ({
  starts_at: fromLocalInput(f.starts_at),
  capacity: num(f.capacity),
  credit_override: f.credit_override === '' ? null : Number(f.credit_override),
});

export default function AdminClassesPage() {
  const ask = useDialog();
  const toast = useToast();
  const attempt = useAttempt();
  const [meta, setMeta] = useState(null);
  const [instructors, setInstructors] = useState(null);
  const [classes, setClasses] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [sessions, setSessions] = useState(null);
  const detailRef = useRef(null);

  const loadClasses = useCallback(async () => {
    const data = await attempt(() => api('/admin/classes'));
    if (!data) return;
    setClasses(data);
    setSelectedId((cur) => (data.some((c) => c.id === cur) ? cur : (data[0]?.id ?? null)));
  }, [attempt]);

  const loadSessions = useCallback(async () => {
    if (!selectedId) return;
    const data = await attempt(() => api(`/admin/classes/${selectedId}/sessions`));
    if (data) setSessions(data);
  }, [selectedId, attempt]);

  useEffect(() => {
    const fromUrl = Number(new URLSearchParams(window.location.search).get('class'));
    if (fromUrl) setSelectedId(fromUrl);
    Promise.all([attempt(() => api('/meta')), attempt(() => api('/admin/instructors'))]).then(([m, i]) => {
      setMeta(m);
      setInstructors(i);
    });
    loadClasses();
  }, [attempt, loadClasses]);

  useEffect(() => {
    setSessions(null);
    loadSessions();
  }, [loadSessions]);

  const refresh = () => {
    loadClasses();
    loadSessions();
  };

  function select(id) {
    setSelectedId(id);
    window.history.replaceState(null, '', `?class=${id}`);
    if (window.innerWidth < 900) detailRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  const ready = meta && instructors && classes;
  const cls = classes?.find((c) => c.id === selectedId);

  // --- Class form fields (uncontrolled; `key` resets them per class) ---
  const classFields = (c = {}) => (
    <div className="form-grid">
      <label className="field full">
        <span>Title</span>
        <input className="input" name="title" required minLength={3} maxLength={80} defaultValue={c.title ?? ''} />
      </label>
      <label className="field">
        <span>Discipline</span>
        <select className="select" name="discipline" required defaultValue={c.discipline ?? ''}>
          <Options list={meta.disciplines} placeholder="Choose…" />
        </select>
      </label>
      <label className="field">
        <span>Level</span>
        <select className="select" name="level" required defaultValue={c.level ?? 'Beginner'}>
          <Options list={meta.levels} />
        </select>
      </label>
      <label className="field">
        <span>Instructor</span>
        <select className="select" name="instructor_email" required defaultValue={c.instructor?.email ?? ''}>
          <Options list={instructors.map((i) => [i.email, i.name])} placeholder="Choose…" />
        </select>
      </label>
      <label className="field">
        <span>Location</span>
        <select className="select" name="location_id" required defaultValue={c.location?.id ?? ''}>
          <Options list={meta.locations.map((l) => [l.id, `${l.neighborhood} (${l.zip})`])} placeholder="Choose…" />
        </select>
      </label>
      <label className="field">
        <span>Length (min)</span>
        <input className="input" type="number" name="duration_min" min={15} max={180} step={5} required defaultValue={c.duration_min ?? 60} />
      </label>
      <label className="field">
        <span>Default capacity</span>
        <input className="input" type="number" name="capacity" min={1} max={meta.rules.maxCapacity} required defaultValue={c.capacity ?? 12} />
        <small>Used for new sessions.</small>
      </label>
      <label className="field">
        <span>Base price (credits)</span>
        <input className="input" type="number" name="credit_cost" min={1} max={meta.rules.maxCredits} required defaultValue={c.credit_cost ?? 2} />
      </label>
      <label className="field full">
        <span>Description</span>
        <textarea className="textarea" name="description" maxLength={500} defaultValue={c.description ?? ''} />
      </label>
    </div>
  );

  const sessionFields = (c, s = {}) => {
    const start = new Date();
    start.setDate(start.getDate() + 7);
    start.setHours(18, 0, 0, 0);
    return (
      <div className="form-grid">
        <label className="field full">
          <span>Starts</span>
          <input
            className="input"
            type="datetime-local"
            name="starts_at"
            required
            defaultValue={toLocalInput(s.starts_at ?? start.toISOString())}
            min={toLocalInput(new Date().toISOString())}
          />
        </label>
        <label className="field">
          <span>Capacity</span>
          <input
            className="input"
            type="number"
            name="capacity"
            min={Math.max(1, s.booked ?? 1)}
            max={meta.rules.maxCapacity}
            required
            defaultValue={s.capacity ?? c.capacity}
          />
          {s.booked ? <small>{s.booked} already booked</small> : null}
        </label>
        <label className="field">
          <span>Price override (credits)</span>
          <input
            className="input"
            type="number"
            name="credit_override"
            min={0}
            max={meta.rules.maxCredits}
            placeholder={`${c.credit_cost} (class price)`}
            defaultValue={s.credit_override ?? ''}
          />
          <small>Leave blank to use the class price.</small>
        </label>
      </div>
    );
  };

  // --- Actions ---
  async function saveClass(e) {
    e.preventDefault();
    const body = classBody(Object.fromEntries(new FormData(e.currentTarget)));
    if (await attempt(() => api(`/admin/classes/${cls.id}`, { method: 'PATCH', body }), 'Class saved.')) refresh();
  }

  async function toggleArchive() {
    const status = cls.status === 'active' ? 'archived' : 'active';
    if (status === 'archived') {
      const ok = await ask({
        title: `Archive ${cls.title}?`,
        body: <p>Members will no longer see its sessions. Existing bookings stay; cancel sessions first if you need to refund people.</p>,
        confirm: 'Archive',
        kind: 'danger',
      });
      if (!ok) return;
    }
    const msg = status === 'archived' ? 'Class archived.' : 'Class restored.';
    if (await attempt(() => api(`/admin/classes/${cls.id}`, { method: 'PATCH', body: { status } }), msg)) refresh();
  }

  async function newClass() {
    const form = await ask({ title: 'New class', body: classFields(), confirm: 'Create class', wide: true });
    if (!form) return;
    const res = await attempt(
      () => api('/admin/classes', { method: 'POST', body: classBody(form) }),
      'Class created. Add sessions to put it on the schedule.',
    );
    if (res) {
      await loadClasses();
      select(res.id);
    }
  }

  async function addSession() {
    const form = await ask({ title: `Add a ${cls.title} session`, body: sessionFields(cls), confirm: 'Add session' });
    if (!form) return;
    if (await attempt(() => api(`/admin/classes/${cls.id}/sessions`, { method: 'POST', body: sessionBody(form) }), 'Session added.')) refresh();
  }

  async function editSession(s) {
    const form = await ask({ title: `Edit session · ${fmtDateTime(s.starts_at)}`, body: sessionFields(cls, s), confirm: 'Save session' });
    if (!form) return;
    if (await attempt(() => api(`/admin/sessions/${s.id}`, { method: 'PATCH', body: sessionBody(form) }), 'Session updated.')) refresh();
  }

  async function cancelSession(s) {
    const form = await ask({
      title: `Cancel ${cls.title}, ${fmtDateTime(s.starts_at)}?`,
      body: (
        <>
          {s.booked ? (
            <div className="notice warn">{plural(s.booked, 'member')} will be refunded in full.</div>
          ) : (
            <p className="muted">Nobody is booked yet.</p>
          )}
          <label className="field">
            <span>Reason (shown to members)</span>
            <input className="input" name="reason" maxLength={200} placeholder="e.g. Instructor unavailable" />
          </label>
        </>
      ),
      confirm: 'Cancel session',
      cancel: 'Keep it',
      kind: 'danger',
    });
    if (!form) return;
    const res = await attempt(() => api(`/admin/sessions/${s.id}/cancel`, { method: 'POST', body: form }));
    if (!res) return;
    toast(`Session cancelled. ${plural(res.members_refunded, 'member')} refunded.`, 'success');
    refresh();
  }

  async function showRoster(s) {
    const data = await attempt(() => api(`/admin/sessions/${s.id}/roster`));
    if (!data) return;
    await ask({
      title: `Roster · ${fmtDateTime(s.starts_at)}`,
      confirm: null,
      cancel: 'Close',
      body: data.roster.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.roster.map((r) => (
                <tr key={r.booking_id}>
                  <td>
                    <strong>{r.member.name}</strong>
                    <br />
                    <span className="muted small">{r.member.email}</span>
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="Nobody booked" />
      ),
    });
  }

  const head = (
    <PageHead
      eyebrow="Admin"
      title="Classes & sessions"
      actions={
        <button className="btn btn-accent" onClick={newClass} disabled={!ready}>
          New class
        </button>
      }
    >
      Edit a class&apos;s details and default capacity, add sessions, change a session&apos;s time, capacity or price, or
      cancel it (booked members are refunded automatically).
    </PageHead>
  );

  if (!ready) return (
    <>
      {head}
      <Loading />
    </>
  );

  const now = new Date();
  return (
    <>
      {head}
      <div className="split">
        <div className="demo-users">
          {!classes.length ? (
            <Empty title="No classes yet" />
          ) : (
            classes.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`demo-user list-item ${c.id === selectedId ? 'selected' : ''} ${c.status === 'archived' ? 'dim' : ''}`}
                onClick={() => select(c.id)}
              >
                <span className="info">
                  <strong>{c.title}</strong>
                  <span>
                    {c.instructor.name} · {c.location.neighborhood} · {credits(c.credit_cost)}
                  </span>
                </span>
                {c.status === 'archived' ? <StatusBadge status="archived" /> : <span className="badge">{c.upcoming_sessions} upcoming</span>}
              </button>
            ))
          )}
        </div>

        <div ref={detailRef}>
          {!cls ? (
            <Empty title="Pick a class" />
          ) : (
            <div className="stack">
              <form className="card stack" key={`${cls.id}-${cls.title}-${cls.status}`} onSubmit={saveClass}>
                <div className="card-head" style={{ margin: 0 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <h2>{cls.title}</h2>
                    <StatusBadge status={cls.status} />
                  </div>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={toggleArchive}>
                    {cls.status === 'active' ? 'Archive' : 'Restore'}
                  </button>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <DisciplineBadge discipline={cls.discipline} />
                  <LevelBadge level={cls.level} />
                  {cls.proposal_id && <span className="badge">From proposal #{cls.proposal_id}</span>}
                </div>
                {classFields(cls)}
                <div className="row">
                  <span className="muted small">Price changes apply to new bookings only.</span>
                  <span className="spacer" />
                  <button className="btn btn-primary">Save changes</button>
                </div>
              </form>

              <div className="card flush">
                <div className="card-head" style={{ padding: '18px 20px 0' }}>
                  <h2>Sessions</h2>
                  <button className="btn btn-primary btn-sm" onClick={addSession}>
                    Add session
                  </button>
                </div>
                <div className="table-wrap">
                  {!sessions ? (
                    <p className="loading" style={{ padding: 20 }}>
                      Loading…
                    </p>
                  ) : !sessions.length ? (
                    <div style={{ padding: '0 20px 20px' }}>
                      <Empty title="No sessions">Add one to put this class on the schedule.</Empty>
                    </div>
                  ) : (
                    <table className="table">
                      <thead>
                        <tr>
                          <th>When</th>
                          <th>Booked</th>
                          <th>Price</th>
                          <th>Status</th>
                          <th className="num">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessions.map((s) => {
                          const past = new Date(s.starts_at) <= now;
                          const editable = !past && s.status === 'scheduled';
                          return (
                            <tr key={s.id} style={past ? { opacity: 0.65 } : undefined}>
                              <td className="nowrap">{fmtDateTime(s.starts_at)}</td>
                              <td className="nowrap">
                                {s.booked} / {s.capacity}
                              </td>
                              <td className="nowrap">
                                {credits(s.credits)} {s.credit_override !== null && <span className="badge orange">override</span>}
                              </td>
                              <td>
                                <StatusBadge status={s.status === 'cancelled' ? 'cancelled' : past ? 'done' : 'scheduled'} />
                              </td>
                              <td className="num">
                                <div className="row" style={{ gap: 6, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                                  <button className="btn btn-ghost btn-sm" onClick={() => showRoster(s)}>
                                    Roster
                                  </button>
                                  {editable && (
                                    <>
                                      <button className="btn btn-ghost btn-sm" onClick={() => editSession(s)}>
                                        Edit
                                      </button>
                                      <button className="btn btn-danger-ghost btn-sm" onClick={() => cancelSession(s)}>
                                        Cancel
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
