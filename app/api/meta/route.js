import { handler } from '@/lib/server/http';
import { getMeta } from '@/lib/server/services/catalog';

export const GET = handler(() => getMeta());
