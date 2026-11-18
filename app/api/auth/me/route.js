import { handler } from '@/lib/server/http';
import { publicUser } from '@/lib/server/services/present';

export const GET = handler(({ user }) => publicUser(user), { roles: ['member', 'instructor', 'admin'] });
