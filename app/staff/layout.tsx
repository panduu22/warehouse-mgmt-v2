import { AppShellClient } from '@/components/AppShellClient';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Staff Management',
};

export default function StaffLayout({ children }: { children: ReactNode }) {
  return <AppShellClient>{children}</AppShellClient>;
}
