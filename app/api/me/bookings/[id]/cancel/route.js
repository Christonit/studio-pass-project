import { handler } from '@/lib/server/http';
import { cancelBooking } from '@/lib/server/services/bookings';

export const POST = handler(({ user, params }) => cancelBooking(user, params.id), { roles: ['member'] });
