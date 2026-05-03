/**
 * /vienna-school/* layout.
 *
 * Rail-less, full-width scrollable column. The room is editorial in
 * character — module pages set their own max-width inside the body —
 * so the chrome here intentionally minimal. A dedicated SchoolroomRail
 * may follow once the full curriculum is shipped and module-to-module
 * navigation needs to be persistent.
 */

export default function VienneSchoolLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
      {children}
    </main>
  );
}
