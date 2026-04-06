import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BriefingMarkdown } from '@/components/briefings/BriefingMarkdown';
import { getCurrentUser } from '@/lib/auth';
import { hasAccess, TIER_PRICES_GBP } from '@/lib/auth/tier';
import type { Tier } from '@/types';
import Link from 'next/link';
import { PersonalBriefingContext } from '@/components/briefing/PersonalBriefingContext';
import { getLiveSatsPerGbp, gbpToSats } from '@/lib/lnm/rates';

interface Props {
  params: Promise<{ date: string }>;
}

const THREAT_COLORS: Record<string, string> = {
  // Current unified states (Members Room algorithm)
  QUIET:      '#2a6e2a',
  MONITORING: '#5a7e2a',
  ELEVATED:   '#b8860b',
  ALERT:      '#b85020',
  CRITICAL:   '#ff4444',
  // Legacy states (historical briefings in DB)
  LOW:        '#2a6e2a',
  GUARDED:    '#5a7e2a',
  HIGH:       '#b85020',
  SEVERE:     '#c04040',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const briefing = await prisma.briefing.findUnique({
    where: { date: new Date(date) },
    select: { headline: true, threatLevel: true, convictionScore: true },
  });
  if (!briefing) return { title: 'Briefing Not Found — Situation Room' };
  return {
    title: `${briefing.headline} — Situation Room`,
    description: `Daily Bitcoin & Macro Intelligence Briefing for ${date}. Threat: ${briefing.threatLevel}. Conviction: ${Math.round(briefing.convictionScore)}/100.`,
  };
}

export default async function BriefingPage({ params }: Props) {
  const { date } = await params;

  const [briefing, user, satsPerGbp] = await Promise.all([
    prisma.briefing.findUnique({ where: { date: new Date(date) } }),
    getCurrentUser(),
    getLiveSatsPerGbp(),
  ]);
  const generalSats = gbpToSats(TIER_PRICES_GBP.general, satsPerGbp).toLocaleString();

  if (!briefing) notFound();

  // Unauthenticated: sign-in wall
  if (!user) {
    return (
      <article className="max-w-2xl mx-auto px-6 py-10" style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.18em', color: 'var(--text-muted)', marginBottom: '16px' }}>
          SITUATION ROOM
        </p>
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '22px', fontWeight: 'normal', color: 'var(--text-primary)', marginBottom: '12px' }}>
          {briefing.headline}
        </h1>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
          Sign in to read this briefing.
        </p>
        <Link
          href="/login"
          style={{ display: 'inline-block', padding: '10px 24px', backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.12em', textDecoration: 'none' }}
        >
          SIGN IN →
        </Link>
      </article>
    );
  }

  const userTier = (user.tier as Tier) ?? 'free';
  const canReadFull = hasAccess(userTier, 'general');

  // Free tier: can view outlook section only, within 7-day window
  const daysSinceBriefing = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
  const freeWindowExpired = !canReadFull && daysSinceBriefing > 7;

  const sourcesCount = (JSON.parse(briefing.sourcesJson) as unknown[]).length;
  const dataSnapshot = JSON.parse(briefing.dataSnapshotJson) as Record<string, number>;

  const [prevBriefing, nextBriefing] = await Promise.all([
    prisma.briefing.findFirst({
      where: { date: { lt: briefing.date } },
      orderBy: { date: 'desc' },
      select: { date: true },
    }),
    prisma.briefing.findFirst({
      where: { date: { gt: briefing.date } },
      orderBy: { date: 'asc' },
      select: { date: true },
    }),
  ]);

  const sections = [
    { key: 'market',  title: 'I. Market Conditions',    content: briefing.marketSection },
    { key: 'network', title: 'II. Network Health',      content: briefing.networkSection },
    { key: 'geo',     title: 'III. Geopolitical Watch', content: briefing.geopoliticalSection },
    { key: 'macro',   title: 'IV. Macro Pulse',         content: briefing.macroSection },
    { key: 'outlook', title: 'V. Outlook',              content: briefing.outlookSection },
  ];

  const threatColor   = THREAT_COLORS[briefing.threatLevel] || 'var(--text-muted)';
  const generatedTime = new Date(briefing.generatedAt).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
  });
  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <article className="max-w-2xl mx-auto px-6 py-10">

      {/* Breadcrumb nav */}
      <div
        className="flex items-center justify-between mb-8"
        style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}
      >
        <a href="/briefings" style={{ color: 'var(--text-muted)', textDecoration: 'none' }} className="hover:underline">
          ← Archive
        </a>
        <span>Daily Briefing</span>
        <span>Generated {generatedTime}</span>
      </div>

      {/* Double rule */}
      <div style={{ borderTop: '3px double var(--border-primary)', marginBottom: '4px' }} />
      <div style={{ borderTop: '1px solid var(--border-primary)', marginBottom: '14px' }} />

      {/* Date */}
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>
        {displayDate}
      </p>

      {/* Headline — always visible */}
      <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '26px', fontWeight: 'normal', lineHeight: 1.3, color: 'var(--text-primary)', marginBottom: '16px' }}>
        {briefing.headline}
      </h1>

      {/* Badges — always visible */}
      <div className="flex items-center gap-3 flex-wrap mb-2">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: threatColor, border: `1px solid ${threatColor}`, padding: '2px 8px' }}>
          Threat: {briefing.threatLevel}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)', border: '1px solid var(--border-primary)', padding: '2px 8px' }}>
          Conviction: {Math.round(briefing.convictionScore)}/100
        </span>
        {sourcesCount > 0 && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
            {sourcesCount} sources
          </span>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border-primary)', marginTop: '16px', marginBottom: '20px' }} />

      {/* Data snapshot — always visible */}
      {dataSnapshot && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', fontFamily: 'var(--font-mono)', fontSize: '11px', marginBottom: '32px', border: '1px solid var(--border-subtle)' }}>
          {[
            ['BTC Price',    `$${(dataSnapshot.btcPrice || 0).toLocaleString()}`],
            ['24h Change',   `${(dataSnapshot.btc24hPct || 0).toFixed(2)}%`],
            ['Fear & Greed', `${dataSnapshot.fearGreed || '—'}`],
            ['Hashrate',     `${(dataSnapshot.hashrateEH || 0).toFixed(1)} EH/s`],
            ['MVRV',         `${(dataSnapshot.mvrv || 0).toFixed(2)}`],
            ['Block Height', `${(dataSnapshot.blockHeight || 0).toLocaleString()}`],
            ['S&P 500',      `${(dataSnapshot.sp500 || 0).toLocaleString()}`],
            ['VIX',          `${(dataSnapshot.vix || 0).toFixed(2)}`],
            ['Gold',         `$${(dataSnapshot.gold || 0).toFixed(0)}`],
            ['DXY',          `${(dataSnapshot.dxy || 0).toFixed(2)}`],
            ['US 10Y',       `${(dataSnapshot.us10y || 0).toFixed(2)}%`],
            ['Oil',          `$${(dataSnapshot.oil || 0).toFixed(2)}`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-1.5 px-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
              <span style={{ color: 'var(--text-primary)' }}>{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Sections ──────────────────────────────────────────────────────── */}
      {canReadFull ? (
        /* General+ : all 5 sections */
        <>
          {sections.map((section, i) => (
            <section key={section.key} style={{ marginBottom: i < sections.length - 1 ? '36px' : '28px' }}>
              <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '14px' }}>
                {section.title}
              </h2>
              <BriefingMarkdown content={section.content} />
            </section>
          ))}
          {/* VIP personalised position context — renders client-side if applicable */}
          <PersonalBriefingContext date={date} />
        </>
      ) : freeWindowExpired ? (
        /* Free tier — briefing older than 7 days */
        <div style={{ border: '1px solid var(--border-primary)', padding: '32px 28px', textAlign: 'center', marginBottom: '32px', backgroundColor: 'var(--bg-secondary)' }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.18em', color: 'var(--text-muted)', marginBottom: '10px' }}>
            FREE ARCHIVE · 7 DAYS
          </p>
          <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
            This briefing is outside the 7-day free window.
            <br />
            Subscribe to General for 30-day full archive access.
          </p>
          <Link
            href="/support"
            style={{ display: 'inline-block', padding: '10px 24px', backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.12em', textDecoration: 'none' }}
          >
            SUBSCRIBE ⚡ {generalSats} SATS
          </Link>
        </div>
      ) : (
        /* Free tier — within 7 days: show outlook only + upgrade prompt for full */
        <>
          {/* Outlook section (V) */}
          <section style={{ marginBottom: '28px' }}>
            <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '14px' }}>
              V. Outlook
            </h2>
            <BriefingMarkdown content={briefing.outlookSection} />
          </section>

          {/* Upgrade prompt for full sections */}
          <div style={{ border: '1px solid var(--border-primary)', padding: '32px 28px', textAlign: 'center', marginBottom: '32px', backgroundColor: 'var(--bg-secondary)' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.18em', color: 'var(--text-muted)', marginBottom: '10px' }}>
              4 MORE SECTIONS · MARKET · NETWORK · GEOPOLITICAL · MACRO
            </p>
            <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '20px' }}>
              Full briefings with all 5 agent sections available to General members.
            </p>
            <Link
              href="/support"
              style={{ display: 'inline-block', padding: '10px 24px', backgroundColor: 'var(--accent-primary)', color: 'var(--bg-primary)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.12em', textDecoration: 'none' }}
            >
              SUBSCRIBE ⚡ {generalSats} SATS/MO
            </Link>
          </div>
        </>
      )}

      {/* Prev / Next — always visible */}
      <nav className="flex items-center justify-between mt-12 pt-6"
        style={{ borderTop: '1px solid var(--border-primary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
        {prevBriefing ? (
          <a href={`/briefing/${prevBriefing.date.toISOString().split('T')[0]}`}
            style={{ color: 'var(--text-secondary)', textDecoration: 'none' }} className="hover:underline">
            ← Previous
          </a>
        ) : <span />}
        <a href="/briefings"
          style={{ color: 'var(--text-muted)', textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '10px' }}
          className="hover:underline">
          Archive
        </a>
        {nextBriefing ? (
          <a href={`/briefing/${nextBriefing.date.toISOString().split('T')[0]}`}
            style={{ color: 'var(--text-secondary)', textDecoration: 'none' }} className="hover:underline">
            Next →
          </a>
        ) : <span />}
      </nav>

    </article>
  );
}
