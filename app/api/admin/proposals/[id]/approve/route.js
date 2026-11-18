import { handler } from '@/lib/server/http';
import { approveProposal } from '@/lib/server/services/proposals';

export const POST = handler(({ user, params, body }) => approveProposal(user, params.id, body), { roles: ['admin'] });
