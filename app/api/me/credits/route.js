import { handler } from '@/lib/server/http';
import { getLedger } from '@/lib/server/services/credits';

export const GET = handler(({ user }) => getLedger(user), { roles: ['member'] });
