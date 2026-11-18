import AppShell from '@/components/AppShell';
import { requireRole } from '@/lib/server/session';

export const metadata = { title: 'Member' };

export default async function MemberLayout({ children }) {
  const user = await requireRole('member');
  return <AppShell user={user}>{children}</AppShell>;
}
