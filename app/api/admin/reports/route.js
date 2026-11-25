import { handler } from '@/lib/server/http';
import { getReports } from '@/lib/server/services/reports';

export const GET = handler(({ query }) => getReports({ days: query.days ?? '30' }), { roles: ['admin'] });
