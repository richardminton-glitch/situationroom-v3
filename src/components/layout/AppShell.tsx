/**
 * AppShell — wraps non-dashboard pages (Briefings, etc.) in the
 * standard Sidebar + DashboardHeader layout structure.
 * Server component: safe to import client components (Sidebar, DashboardHeader).
 */
import { Sidebar } from './Sidebar';
import { DashboardHeader } from './DashboardHeader';

interface Props {
  children: React.ReactNode;
}

export function AppShell({ children }: Props) {
  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0" style={{ position: 'relative' }}>
        <DashboardHeader />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
