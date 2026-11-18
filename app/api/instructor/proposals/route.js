import { handler } from '@/lib/server/http';
import { createProposal, listProposals } from '@/lib/server/services/proposals';

const instructor = { roles: ['instructor'] };
export const GET = handler(({ user }) => listProposals({ instructorEmail: user.email }), instructor);
export const POST = handler(({ user, body }) => createProposal(user, body), { ...instructor, status: 201 });
