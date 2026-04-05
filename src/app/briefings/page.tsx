import { prisma } from '@/lib/db';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { hasAccess } from '@/lib/auth/tier';
import { BriefingSearch } from '@/components/briefings/BriefingSearch';
import type { Tier } from '@/types';

export const metadata: Metadata = {
  title: 'Briefing Archive — Situation Room',
  description: 'Daily Bitcoin & Macro Intelligence Briefing archive.',
};

export const dynamic = 'force-dynamic';

const THREAT_COLORS: Record<string, string> = {
  LOW:      '#2a6e2a',
  GUARDED:  '#5a7e2a',
  ELEVATED: '#b8860b',
  HIGH:     '#b85020',
  SEVERE:   '#c04040',
  CRITICAL: '#ff4444',
};

export default async function BriefingsArchivePage() {
  const user = await getCurrentUser();
  const userTier = (user?.tier as Tier) ?? 'free';
  const canReadArchive = hasAccess(userTier, 'general');
  const isVip = hasAccess(userTier, 'vip');

  // General+: 30 days. Free: 7 days (outlook section only on detail page).
  const briefings = await prisma.briefing.findMany({
    select: { date: true, headline: true, threatLevel: true, convictionScore: true, generatedAt: true },
    orderBy: { date: 'desc' },
    take: canReadArchive ? 30 : 7,
  });

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">

      {/* Masthead */}
      <header className="mb-10">
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px' }}>
          Situation Room
        </p>
        <div style={{ borderTop: '3px double var(--border-primary)', paddingTop: '10px', marginBottom: '6px' }} />
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '28px', fontWeight: 'normal', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-primary)', marginBottom: '4px' }}>
          Intelligence Briefings
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
          Daily Bitcoin &amp; Global Macro — 5-agent AI analysis with live web search
        </p>
        <div style={{ borderTop: '1px solid var(--border-primary)', marginTop: '10px' }} />
      </header>

      {/* VIP: Briefing Archive Intelligence */}
      {isVip && <BriefingSearch />}

      {/* Archive */}
      {briefings.length === 0 ? (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.06em', padding: '24px 0', borderTop: '1px solid var(--border-subtle)' }}>
          No briefings available yet — the first one generates automatically at 06:00 UTC.
        </div>
      ) : (
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px' }}>
            {canReadArchive ? `Archive — last 30 days` : `Recent briefings — last 7 days (outlook only)`}
          </p>

          {briefings.map((b, i) => {
            const dateStr = b.date.toISOString().split('T')[0];
            const isToday = dateStr === today;
            const threatColor = THREAT_COLORS[b.threatLevel] || 'var(--text-muted)';

            return (
              <Link key={dateStr} href={`/briefing/${dateStr}`} style={{ display: 'block', textDecoration: 'none' }} className="group">
                <div
                  style={{ borderTop: '1px solid var(--border-subtle)', padding: '12px 0', borderBottom: i === briefings.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                  className="group-hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Date + meta */}
                    <div style={{ minWidth: '130px', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: isToday ? 'var(--accent-primary)' : 'var(--text-muted)', letterSpacing: '0.04em', marginBottom: '2px' }}>
                        {isToday && <span style={{ marginRight: '4px' }}>●</span>}
                        {new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: threatColor }}>
                          {b.threatLevel}
                        </span>
                        <span style={{ color: 'var(--border-primary)', fontSize: '8px' }}>·</span>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                          {Math.round(b.convictionScore)}/100
                        </span>
                      </div>
                    </div>

                    {/* Headline */}
                    <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.45, flex: 1 }}>
                      {b.headline}
                    </p>

                    {/* Arrow */}
                    <span
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0, alignSelf: 'center' }}
                      className="group-hover:opacity-100 opacity-0 transition-opacity"
                    >
                      →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}

          {/* Upgrade prompt for free users */}
          {!canReadArchive && (
            <div style={{ marginTop: '24px', padding: '20px 24px', border: '1px solid var(--border-primary)', backgroundColor: 'var(--bg-secondary)', textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.16em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                30-DAY ARCHIVE · DAILY DELIVERY · 5-AGENT ANALYSIS
              </p>
              <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '16px' }}>
                Full archive access and daily briefing delivery included with General membership.
              </p>
              <Link
                href="/support"
                style={{ display: 'inline-block', padding: '9px 22px', backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.12em', textDecoration: 'none' }}
              >
                SUBSCRIBE ⚡ 10,000 SATS/MO
              </Link>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
