import { handler } from '@/lib/server/http';
import { listProposals } from '@/lib/server/services/proposals';

export const GET = handler(({ query }) => listProposals({ status: query.status }), { roles: ['admin'] });
