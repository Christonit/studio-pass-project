import { handler } from '@/lib/server/http';
import { updateLocation } from '@/lib/server/services/admin';

export const PATCH = handler(({ params, body }) => updateLocation(params.id, body), { roles: ['admin'] });
