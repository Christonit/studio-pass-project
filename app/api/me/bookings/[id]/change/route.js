import { handler } from '@/lib/server/http';
import { changeBooking } from '@/lib/server/services/bookings';

export const POST = handler(({ user, params, body }) => changeBooking(user, params.id, body.session_id), { roles: ['member'] });
