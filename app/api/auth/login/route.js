import { handler, sessionCookie } from '@/lib/server/http';
import { login } from '@/lib/server/services/auth';

export const POST = handler(async ({ body }) => {
  const user = await login(body);
  return Response.json(user, { headers: { 'Set-Cookie': sessionCookie(user.email) } });
});
