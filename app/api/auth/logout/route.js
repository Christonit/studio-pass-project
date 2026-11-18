import { clearSessionCookie } from '@/lib/server/http';

export function POST() {
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie() } });
}
