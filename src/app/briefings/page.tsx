import { prisma } from '@/lib/db';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Briefing Archive — Situation Room',
  description: 'Daily Bitcoin & Macro Intelligence Briefing archive.',
};

export const dynamic = 'force-dynamic';

export default async function BriefingsArchivePage() {
  const briefings = await prisma.briefing.findMany({
    select: {
      date: true,
      headline: true,
      threatLevel: true,
      convictionScore: true,
      generatedAt: true,
    },
    orderBy: { date: 'desc' },
    take: 90,
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
        >
          Briefing Archive
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
          Daily intelligence briefings — Bitcoin, macro, and geopolitics.
        </p>

        {briefings.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>
            No briefings generated yet.
          </p>
        ) : (
          <div className="space-y-3">
            {briefings.map((b) => {
              const dateStr = b.date.toISOString().split('T')[0];
              return (
                <Link
                  key={dateStr}
                  href={`/briefing/${dateStr}`}
                  className="panel-card block p-4 hover:opacity-90 transition-opacity"
                >
                  <div className="flex items-center justify-between mb-1">
                    <time
                      className="text-xs"
                      style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-data)' }}
                    >
                      {new Date(dateStr).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </time>
                    <div className="flex gap-2">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {b.threatLevel}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-data)' }}>
                        {b.convictionScore}/100
                      </span>
                    </div>
                  </div>
                  <p
                    className="text-sm"
                    style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
                  >
                    {b.headline}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
