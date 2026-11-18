import AppShell from '@/components/AppShell';
import { requireRole } from '@/lib/server/session';

export const metadata = { title: 'Instructor' };

export default async function InstructorLayout({ children }) {
  const user = await requireRole('instructor');
  return <AppShell user={user}>{children}</AppShell>;
}
