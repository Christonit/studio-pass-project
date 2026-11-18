import { handler } from '@/lib/server/http';
import { listInstructors } from '@/lib/server/services/admin';

export const GET = handler(() => listInstructors(), { roles: ['admin'] });
