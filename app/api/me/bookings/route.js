import { handler } from '@/lib/server/http';
import { bookSession, listMyBookings } from '@/lib/server/services/bookings';

const member = { roles: ['member'] };
export const GET = handler(({ user }) => listMyBookings(user), member);
export const POST = handler(({ user, body }) => bookSession(user, body.session_id), { ...member, status: 201 });
