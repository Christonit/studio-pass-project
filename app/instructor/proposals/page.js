'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAttempt } from '@/components/Providers';
import { DisciplineBadge, Empty, LevelBadge, Loading, Options, PageHead, StatusBadge } from '@/components/ui';
import { api } from '@/lib/client/api';
import { credits, fmtDate, fmtDateTime, fromLocalInput, toLocalInput } from '@/lib/client/format';

function nextWeekAt6pm() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(18, 0, 0, 0);
  return toLocalInput(d.toISOString());
}

export default function ProposalsPage() {
  const attempt = useAttempt();
  const [meta, setMeta] = useState(null);
  const [proposals, setProposals] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [defaults, setDefaults] = useState(null);

  const load = useCallback(async () => {
    const data = await attempt(() => api('/instructor/proposals'));
    if (data) setProposals(data);
  }, [attempt]);

  useEffect(() => {
    attempt(() => api('/meta')).then(setMeta);
    setDefaults({ first: nextWeekAt6pm(), min: toLocalInput(new Date().toISOString()) });
    load();
  }, [attempt, load]);

  async function submit(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    const body = {
      ...f,
      location_id: Number(f.location_id),
      duration_min: Number(f.duration_min),
      capacity: Number(f.capacity),
      credit_cost: Number(f.credit_cost),
      weekly_repeats: Number(f.weekly_repeats),
      first_session_at: fromLocalInput(f.first_session_at),
    };
    const res = await attempt(() => api('/instructor/proposals', { method: 'POST', body }), 'Proposal sent to the admin.');
    if (res) {
      setFormKey((k) => k + 1); // reset the form
      load();
    }
  }

  return (
    <>
      <PageHead eyebrow="Instructor" title="Class proposals">
        Propose a new class. Once an admin approves it, the class and its weekly sessions go on the schedule for members to book.
      </PageHead>
      <div className="split">
        {!meta || !defaults ? (
          <Loading />
        ) : (
          <form className="card stack" key={formKey} onSubmit={submit}>
            <h2>New proposal</h2>
            <label className="field">
              <span>Class title</span>
              <input className="input" name="title" required minLength={3} maxLength={80} placeholder="e.g. Yoga for Runners" />
            </label>
            <div className="form-grid">
              <label className="field">
                <span>Discipline</span>
                <select className="select" name="discipline" required defaultValue="">
                  <Options list={meta.disciplines} placeholder="Choose…" />
                </select>
              </label>
              <label className="field">
                <span>Level</span>
                <select className="select" name="level" required defaultValue="Beginner">
                  <Options list={meta.levels} />
                </select>
              </label>
              <label className="field full">
                <span>Location</span>
                <select className="select" name="location_id" required defaultValue="">
                  <Options list={meta.locations.map((l) => [l.id, `${l.name} (${l.zip})`])} placeholder="Choose…" />
                </select>
              </label>
              <label className="field">
                <span>Length (minutes)</span>
                <input className="input" type="number" name="duration_min" min={15} max={180} step={5} defaultValue={60} required />
              </label>
              <label className="field">
                <span>Capacity</span>
                <input className="input" type="number" name="capacity" min={1} max={meta.rules.maxCapacity} defaultValue={12} required />
              </label>
              <label className="field">
                <span>Price (credits)</span>
                <input className="input" type="number" name="credit_cost" min={1} max={meta.rules.maxCredits} defaultValue={2} required />
              </label>
              <label className="field">
                <span>Repeats weekly for</span>
                <select className="select" name="weekly_repeats" defaultValue="4">
                  <Options
                    list={Array.from({ length: meta.rules.maxWeeklyRepeats }, (_, i) => [String(i + 1), `${i + 1} week${i ? 's' : ''}`])}
                  />
                </select>
              </label>
              <label className="field full">
                <span>First session</span>
                <input className="input" type="datetime-local" name="first_session_at" required defaultValue={defaults.first} min={defaults.min} />
              </label>
              <label className="field full">
                <span>Description</span>
                <textarea className="textarea" name="description" maxLength={500} placeholder="What should members expect?" />
              </label>
            </div>
            <button className="btn btn-accent">Submit for review</button>
          </form>
        )}

        <div>
          <h2 style={{ marginBottom: 12 }}>Your proposals</h2>
          <div className="stack">
            {!proposals ? (
              <Loading />
            ) : !proposals.length ? (
              <Empty title="No proposals yet">Use the form to propose your first class.</Empty>
            ) : (
              proposals.map((p) => (
                <article className="card proposal" key={p.id}>
                  <div className="card-head" style={{ marginBottom: 8 }}>
                    <h3>{p.title}</h3>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="row" style={{ gap: 6 }}>
                    <DisciplineBadge discipline={p.discipline} />
                    <LevelBadge level={p.level} />
                  </div>
                  <dl className="kv">
                    <dt>Location</dt>
                    <dd>{p.location.name}</dd>
                    <dt>Schedule</dt>
                    <dd>
                      {fmtDateTime(p.first_session_at)}, weekly × {p.weekly_repeats}
                    </dd>
                    <dt>Format</dt>
                    <dd>
                      {p.duration_min} min · {p.capacity} spots · {credits(p.credit_cost)}
                    </dd>
                    <dt>Submitted</dt>
                    <dd>{fmtDate(p.created_at)}</dd>
                  </dl>
                  {p.admin_note && (
                    <div className={`notice ${p.status === 'rejected' ? 'danger' : ''} small`} style={{ marginTop: 12 }}>
                      <b>Admin note:</b> {p.admin_note}
                    </div>
                  )}
                  {p.status === 'approved' && (
                    <p className="small" style={{ marginTop: 12 }}>
                      <Link href="/instructor">See its sessions →</Link>
                    </p>
                  )}
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
