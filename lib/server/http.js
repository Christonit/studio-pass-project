// Helpers for Next.js route handlers (app/api/**/route.js).
//
// PROTOTYPE SESSION: the sp_session cookie holds the signed-in user's email,
// which is their primary key. It is not signed or encrypted: fine for a
// student demo, not for real users.
import { SESSION_COOKIE } from './config.js';
import { userByEmail } from './db/store.js';
import { badRequest, forbidden, unauthorized } from './errors.js';

const MONTH = 60 * 60 * 24 * 30;

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function readCookie(request, name) {
  const header = request.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return safeDecode(rest.join('='));
  }
  return null;
}

export const currentUser = (request) => userByEmail(readCookie(request, SESSION_COOKIE));
export const sessionCookie = (email) =>
  `${SESSION_COOKIE}=${encodeURIComponent(email)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MONTH}`;
export const clearSessionCookie = () => `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

/**
 * Wraps a route handler: resolves the signed-in user, checks roles, parses the
 * JSON body and query string, and turns thrown AppErrors into JSON errors.
 *
 *   export const GET = handler(({ user, params, body, query }) => ..., { roles: ['member'] })
 */
export function handler(fn, { roles, status = 200 } = {}) {
  return async (request, context) => {
    try {
      const user = currentUser(request);
      if (roles) {
        if (!user) throw unauthorized();
        if (!roles.includes(user.role)) throw forbidden(`This is only for ${roles.join(' / ')} accounts.`);
      }
      const rawParams = (await context?.params) ?? {};
      const params = Object.fromEntries(Object.entries(rawParams).map(([k, v]) => [k, safeDecode(v)]));
      let body = {};
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        const text = await request.text();
        if (text) {
          try {
            body = JSON.parse(text);
          } catch {
            throw badRequest('Request body must be JSON.');
          }
        }
      }
      const query = Object.fromEntries(new URL(request.url).searchParams);
      const result = await fn({ request, user, params, body, query });
      if (result instanceof Response) return result;
      return Response.json(result ?? { ok: true }, { status });
    } catch (err) {
      // Duck-typed so it works even if Next bundles errors.js more than once.
      if (Number.isInteger(err?.status) && err.status < 500) {
        return Response.json({ error: err.message }, { status: err.status });
      }
      console.error(err);
      return Response.json({ error: 'Something went wrong on our side.' }, { status: 500 });
    }
  };
}
