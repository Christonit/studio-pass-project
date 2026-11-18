import { handler, sessionCookie } from '@/lib/server/http';
import { signup } from '@/lib/server/services/auth';

// Creates the account and signs it in right away (no email verification).
export const POST = handler(async ({ body }) => {
  const user = await signup(body);
  return Response.json(user, { status: 201, headers: { 'Set-Cookie': sessionCookie(user.email) } });
});
