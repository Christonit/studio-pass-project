import { handler } from '@/lib/server/http';
import { cancelSession } from '@/lib/server/services/admin';

// Cancels the session and refunds every booked member.
export const POST = handler(({ params, body }) => cancelSession(params.id, body), { roles: ['admin'] });
