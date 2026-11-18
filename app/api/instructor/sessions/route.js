import { handler } from '@/lib/server/http';
import { listMySessions } from '@/lib/server/services/instructor';

export const GET = handler(({ user }) => listMySessions(user), { roles: ['instructor'] });
