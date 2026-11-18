import { handler } from '@/lib/server/http';
import { searchSessions } from '@/lib/server/services/catalog';

// Filters: q, discipline, level, zip, days, location_id, class_id
export const GET = handler(({ query, user }) => searchSessions(query, user?.email));
