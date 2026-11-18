'use client';
// Sign in / create account. Prototype rules: no email verification, the account
// works as soon as it's created, and the email is the account's id.
import { useEffect, useState } from 'react';
import { api } from '@/lib/client/api';
import { useAttempt } from '@/components/Providers';

const HOME = { member: '/member', instructor: '/instructor', admin: '/admin' };
const ROLE_LABEL = { member: 'Members', instructor: 'Instructors', admin: 'Admin' };

// Full page load so the server layouts see the new session cookie.
const enter = (user) => window.location.assign(HOME[user.role]);

export default function AuthPanel() {
  const [tab, setTab] = useState('signin');
  const [demoUsers, setDemoUsers] = useState(null);
  const [busy, setBusy] = useState(false);
  const attempt = useAttempt();

  useEffect(() => {
    attempt(() => api('/auth/demo-users')).then((u) => setDemoUsers(u ?? []));
  }, [attempt]);

  async function submit(path, body) {
    setBusy(true);
    const user = await attempt(() => api(path, { method: 'POST', body }));
    if (user) enter(user);
    else setBusy(false);
  }

  const describe = (u) =>
    u.role === 'member' ? `${u.credits} credits · ZIP ${u.zip}` : u.role === 'instructor' ? u.bio : 'Approves proposals, manages the schedule';

  return (
    <div className="card">
      <div className="tabs auth-tabs" role="tablist">
        <button className={tab === 'signin' ? 'active' : ''} onClick={() => setTab('signin')} role="tab">
          Sign in
        </button>
        <button className={tab === 'signup' ? 'active' : ''} onClick={() => setTab('signup')} role="tab">
          Create account
        </button>
      </div>

      {tab === 'signin' ? (
        <div className="stack">
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              submit('/auth/login', Object.fromEntries(new FormData(e.currentTarget)));
            }}
          >
            <label className="field">
              <span>Email</span>
              <input className="input" type="email" name="email" required autoComplete="email" />
            </label>
            <label className="field">
              <span>Password</span>
              <input className="input" type="password" name="password" required autoComplete="current-password" />
            </label>
            <button className="btn btn-primary" disabled={busy}>
              Sign in
            </button>
          </form>

          <div>
            <div className="notice small">
              Or use a demo account (password <b>{demoUsers?.[0]?.demo_password ?? '…'}</b>):
            </div>
            {!demoUsers ? (
              <p className="loading">Loading demo accounts…</p>
            ) : (
              ['member', 'instructor', 'admin'].map((role) => (
                <div key={role}>
                  <div className="group-label">{ROLE_LABEL[role]}</div>
                  <div className="demo-users">
                    {demoUsers
                      .filter((u) => u.role === role)
                      .map((u) => (
                        <button
                          key={u.email}
                          type="button"
                          className="demo-user"
                          disabled={busy}
                          onClick={() => submit('/auth/login', { email: u.email, password: u.demo_password })}
                        >
                          <span className="avatar">{u.name.split(' ').map((p) => p[0]).join('')}</span>
                          <span className="info">
                            <strong>{u.name}</strong>
                            <span>
                              {u.email} · {describe(u)}
                            </span>
                          </span>
                          <span className="muted small">→</span>
                        </button>
                      ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            submit('/auth/signup', Object.fromEntries(new FormData(e.currentTarget)));
          }}
        >
          <p className="muted small">No email verification: your account works as soon as you create it.</p>
          <div className="role-pick">
            <label>
              <input type="radio" name="role" value="member" defaultChecked />
              <span>
                Member<small>Book classes with credits</small>
              </span>
            </label>
            <label>
              <input type="radio" name="role" value="instructor" />
              <span>
                Instructor<small>Propose and teach classes</small>
              </span>
            </label>
          </div>
          <label className="field">
            <span>Full name</span>
            <input className="input" name="name" required minLength={2} autoComplete="name" />
          </label>
          <label className="field">
            <span>Email</span>
            <input className="input" type="email" name="email" required autoComplete="email" />
          </label>
          <label className="field">
            <span>Password</span>
            <input className="input" type="password" name="password" required minLength={4} autoComplete="new-password" />
            <small>At least 4 characters.</small>
          </label>
          <label className="field">
            <span>Home ZIP code</span>
            <input className="input" name="zip" required pattern="\d{5}" inputMode="numeric" maxLength={5} autoComplete="postal-code" />
            <small>Used to show studios near you.</small>
          </label>
          <button className="btn btn-accent" disabled={busy}>
            Create account
          </button>
        </form>
      )}
    </div>
  );
}
