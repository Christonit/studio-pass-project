import { handler } from '@/lib/server/http';
import { addSession, listClassSessions } from '@/lib/server/services/admin';

const admin = { roles: ['admin'] };
export const GET = handler(({ params }) => listClassSessions(params.id), admin);
export const POST = handler(({ params, body }) => addSession(params.id, body), { ...admin, status: 201 });
