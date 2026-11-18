import { handler } from '@/lib/server/http';
import { getSession } from '@/lib/server/services/catalog';

export const GET = handler(({ params, user }) => getSession(params.id, user?.email));
