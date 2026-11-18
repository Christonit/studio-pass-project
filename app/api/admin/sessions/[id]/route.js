import { handler } from '@/lib/server/http';
import { updateSession } from '@/lib/server/services/admin';

export const PATCH = handler(({ params, body }) => updateSession(params.id, body), { roles: ['admin'] });
