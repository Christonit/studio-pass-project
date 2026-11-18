import { handler } from '@/lib/server/http';
import { rejectProposal } from '@/lib/server/services/proposals';

export const POST = handler(({ user, params, body }) => rejectProposal(user, params.id, body), { roles: ['admin'] });
