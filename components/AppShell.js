'use client';
// Header + nav for signed-in pages, and the useSession() hook.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api } from '@/lib/client/api';
import { credits } from '@/lib/client/format';

const NAV = {
  member: [
    ['/member', 'Find classes'],
    ['/member/bookings', 'My bookings'],
    ['/member/credits', 'Credits'],
  ],
  instructor: [
    ['/instructor', 'Rosters & attendance'],
    ['/instructor/proposals', 'Class proposals'],
  ],
  admin: [
    ['/admin', 'Proposals'],
    ['/admin/classes', 'Classes & sessions'],
    ['/admin/locations', 'Locations & ZIP tags'],
    ['/admin/reports', 'Reports'],
  ],
};

const SessionContext = createContext(null);

/** { user, setBalance } — user is the signed-in account (email is its id). */
export const useSession = () => useContext(SessionContext);

export default function AppShell({ user: initialUser, children }) {
  const [user, setUser] = useState(initialUser);
  const pathname = usePathname();
  const setBalance = useCallback((balance) => setUser((u) => ({ ...u, credits: balance })), []);
  const value = useMemo(() => ({ user, setBalance }), [user, setBalance]);

  async function signOut() {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/';
  }

  return (
    <SessionContext.Provider value={value}>
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" href={NAV[user.role][0][0]}>
            <span className="brand-mark">SP</span>StudioPass
          </Link>
          <nav className="nav" aria-label="Main">
            {NAV[user.role].map(([href, label]) => (
              <Link key={href} href={href} className={pathname === href ? 'active' : ''}>
                {label}
              </Link>
            ))}
          </nav>
          <div className="userbox">
            {user.role === 'member' && (
              <Link className="credit-pill" href="/member/credits">
                {credits(user.credits)}
              </Link>
            )}
            <div className="who">
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="page">{children}</main>
      <p className="foot-note">
        StudioPass prototype · dummy data, simple email + password accounts and simulated payments · Team 8 · CIS 9590
      </p>
    </SessionContext.Provider>
  );
}
