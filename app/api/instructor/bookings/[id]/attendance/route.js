import { handler } from '@/lib/server/http';
import { markAttendance } from '@/lib/server/services/instructor';

export const POST = handler(({ user, params, body }) => markAttendance(user, params.id, body.status), { roles: ['instructor'] });
