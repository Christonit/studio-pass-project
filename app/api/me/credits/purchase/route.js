import { handler } from '@/lib/server/http';
import { purchasePackage } from '@/lib/server/services/credits';

// Simulated checkout: adds the credits, no payment is taken.
export const POST = handler(({ user, body }) => purchasePackage(user, body.package_id), { roles: ['member'], status: 201 });
