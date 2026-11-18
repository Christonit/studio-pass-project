import { handler } from '@/lib/server/http';
import { createLocation, listLocations } from '@/lib/server/services/admin';

const admin = { roles: ['admin'] };
export const GET = handler(() => listLocations(), admin);
export const POST = handler(({ user, body }) => createLocation(user, body), { ...admin, status: 201 });
