import AppShell from '@/components/AppShell';
import { requireRole } from '@/lib/server/session';

export const metadata = { title: 'Admin' };

export default async function AdminLayout({ children }) {
  const user = await requireRole('admin');
  return <AppShell user={user}>{children}</AppShell>;
}
