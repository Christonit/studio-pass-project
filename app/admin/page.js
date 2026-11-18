'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAttempt, useDialog } from '@/components/Providers';
import { DisciplineBadge, Empty, LevelBadge, Loading, PageHead, StatusBadge } from '@/components/ui';
import { api } from '@/lib/client/api';
import { credits, fmtDate, fmtDateTime, plural } from '@/lib/client/format';

const TABS = ['pending', 'approved', 'rejected'];

export default function AdminProposalsPage() {
  const ask = useDialog();
  const attempt = useAttempt();
  const [proposals, setProposals] = useState(null);
  const [tab, setTab] = useState('pending');

  const load = useCallback(async () => {
    const data = await attempt(() => api('/admin/proposals'));
    if (data) setProposals(data);
  }, [attempt]);
  useEffect(() => {
    load();
  }, [load]);

  async function approve(p) {
    const form = await ask({
      title: `Approve “${p.title}”?`,
      body: (
        <>
          <p>
            This adds <b>{p.title}</b> with {p.instructor.name} to the schedule: {plural(p.weekly_repeats, 'weekly session')}{' '}
            starting {fmtDateTime(p.first_session_at)}.
          </p>
          <label className="field">
            <span>Note to instructor (optional)</span>
            <textarea className="textarea" name="note" maxLength={500} />
          </label>
        </>
      ),
      confirm: 'Approve and schedule',
    });
    if (!form) return;
    const res = await attempt(
      () => api(`/admin/proposals/${p.id}/approve`, { method: 'POST', body: form }),
      (r) => `Approved. ${plural(r.sessions_created, 'session')} scheduled.`,
    );
    if (res) load();
  }

  async function reject(p) {
    const form = await ask({
      title: `Reject “${p.title}”?`,
      body: (
        <label className="field">
          <span>Reason (sent to {p.instructor.name})</span>
          <textarea
            className="textarea"
            name="note"
            required
            minLength={3}
            maxLength={500}
            placeholder="e.g. That slot overlaps with Power Flow. Could you try Thursday?"
          />
        </label>
      ),
      confirm: 'Reject proposal',
      kind: 'danger',
    });
    if (!form) return;
    const res = await attempt(() => api(`/admin/proposals/${p.id}/reject`, { method: 'POST', body: form }), 'Proposal rejected.');
    if (res) load();
  }

  const list = proposals?.filter((p) => p.status === tab) ?? [];

  return (
    <>
      <PageHead eyebrow="Admin" title="Class proposals">
        Approving a proposal creates the class and its weekly sessions right away. Rejecting sends your note back to the instructor.
      </PageHead>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
            <span className="count">{proposals?.filter((p) => p.status === t).length ?? ''}</span>
          </button>
        ))}
      </div>

      {!proposals ? (
        <Loading />
      ) : !list.length ? (
        <Empty title={tab === 'pending' ? 'All caught up' : `No ${tab} proposals`}>
          {tab === 'pending' ? 'New instructor proposals will show up here.' : null}
        </Empty>
      ) : (
        <div className="grid-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))' }}>
          {list.map((p) => (
            <article className="card proposal stack" style={{ gap: 10 }} key={p.id}>
              <div className="card-head" style={{ margin: 0, alignItems: 'flex-start' }}>
                <div>
                  <h3>{p.title}</h3>
                  <p className="muted small">
                    by {p.instructor.name} ({p.instructor.email}) · {fmtDate(p.created_at)}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <div className="row" style={{ gap: 6 }}>
                <DisciplineBadge discipline={p.discipline} />
                <LevelBadge level={p.level} />
              </div>
              {p.description && <p className="small">{p.description}</p>}
              <dl className="kv" style={{ margin: 0 }}>
                <dt>Location</dt>
                <dd>
                  {p.location.name} ({p.location.zip})
                </dd>
                <dt>First session</dt>
                <dd>{fmtDateTime(p.first_session_at)}</dd>
                <dt>Repeats</dt>
                <dd>Weekly × {p.weekly_repeats}</dd>
                <dt>Format</dt>
                <dd>
                  {p.duration_min} min · {p.capacity} spots · {credits(p.credit_cost)}
                </dd>
              </dl>
              {p.admin_note && (
                <div className={`notice ${p.status === 'rejected' ? 'danger' : ''} small`}>
                  <b>Note:</b> {p.admin_note}
                </div>
              )}
              {p.status === 'approved' && p.class_id && (
                <Link className="small" href={`/admin/classes?class=${p.class_id}`}>
                  Open class →
                </Link>
              )}
              {p.status === 'pending' && (
                <div className="row" style={{ justifyContent: 'flex-end', marginTop: 4 }}>
                  <button className="btn btn-danger-ghost btn-sm" onClick={() => reject(p)}>
                    Reject
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => approve(p)}>
                    Approve
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
