import { handler } from '@/lib/server/http';
import { getRoster } from '@/lib/server/services/instructor';

export const GET = handler(({ user, params }) => getRoster(user, params.id), { roles: ['admin'] });
