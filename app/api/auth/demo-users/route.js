import { handler } from '@/lib/server/http';
import { listDemoUsers } from '@/lib/server/services/auth';

export const GET = handler(() => listDemoUsers());
