import { handler } from '@/lib/server/http';
import { listPackages } from '@/lib/server/services/credits';

export const GET = handler(() => listPackages());
