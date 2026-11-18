import { handler } from '@/lib/server/http';
import { createClass, listClasses } from '@/lib/server/services/admin';

const admin = { roles: ['admin'] };
export const GET = handler(() => listClasses(), admin);
export const POST = handler(({ user, body }) => createClass(user, body), { ...admin, status: 201 });
