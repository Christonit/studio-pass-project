import { handler } from '@/lib/server/http';
import { updateClass } from '@/lib/server/services/admin';

export const PATCH = handler(({ params, body }) => updateClass(params.id, body), { roles: ['admin'] });
