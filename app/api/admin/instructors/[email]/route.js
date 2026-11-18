import { handler } from '@/lib/server/http';
import { updateInstructor } from '@/lib/server/services/admin';

// The instructor's email is their id, e.g. PATCH /api/admin/instructors/maya%40studiopass.test
export const PATCH = handler(({ params, body }) => updateInstructor(params.email, body), { roles: ['admin'] });
