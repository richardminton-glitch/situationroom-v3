'use client';

import { Sidebar } from '@/components/layout/Sidebar';

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{ backgroundColor: '#090d12' }}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  );
}
