// Reads the signed-in user inside server components and layouts.
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE } from './config.js';
import { userByEmail } from './db/store.js';
import { publicUser } from './services/present.js';

export async function getSessionUser() {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  let email = raw;
  try {
    email = decodeURIComponent(raw);
  } catch {
    /* already decoded */
  }
  return publicUser(userByEmail(email));
}

export const homeFor = (role) => ({ member: '/member', instructor: '/instructor', admin: '/admin' })[role] ?? '/';

/** Server-side guard for a role's layout: redirects away if signed out or the wrong role. */
export async function requireRole(role) {
  const user = await getSessionUser();
  if (!user) redirect('/');
  if (user.role !== role) redirect(homeFor(user.role));
  return user;
}
