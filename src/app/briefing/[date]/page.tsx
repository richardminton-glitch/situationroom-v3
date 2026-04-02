import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ date: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const briefing = await prisma.briefing.findUnique({
    where: { date: new Date(date) },
    select: { headline: true, threatLevel: true, convictionScore: true },
  });

  if (!briefing) return { title: 'Briefing Not Found' };

  return {
    title: `${briefing.headline} — Situation Room`,
    description: `Daily Bitcoin & Macro Intelligence Briefing for ${date}. Threat Level: ${briefing.threatLevel}. Conviction: ${briefing.convictionScore}/100.`,
    openGraph: {
      title: briefing.headline,
      description: `Threat: ${briefing.threatLevel} | Conviction: ${briefing.convictionScore}/100`,
      type: 'article',
    },
  };
}

export default async function BriefingPage({ params }: Props) {
  const { date } = await params;
  const briefing = await prisma.briefing.findUnique({
    where: { date: new Date(date) },
  });

  if (!briefing) notFound();

  const sources = JSON.parse(briefing.sourcesJson) as { url: string; title: string }[];
  const headlines = JSON.parse(briefing.headlinesJson) as { title: string; category: string; source: string }[];
  const dataSnapshot = JSON.parse(briefing.dataSnapshotJson) as Record<string, number>;

  // Get prev/next briefing dates
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
    { title: 'Market Conditions', content: briefing.marketSection },
    { title: 'Network Health', content: briefing.networkSection },
    { title: 'Geopolitical Watch', content: briefing.geopoliticalSection },
    { title: 'Macro Pulse', content: briefing.macroSection },
    { title: 'Outlook', content: briefing.outlookSection },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <article className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-10">
          <p
            className="text-xs uppercase tracking-widest mb-2"
            style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}
          >
            Situation Room — Daily Briefing
          </p>
          <time
            className="text-sm block mb-4"
            style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-data)' }}
          >
            {new Date(date).toLocaleDateString('en-GB', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
          <h1
            className="text-2xl leading-snug font-bold"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}
          >
            {briefing.headline}
          </h1>
          <div className="flex gap-4 mt-4">
            <span
              className="text-xs px-2 py-1 rounded"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-primary)',
              }}
            >
              Threat: {briefing.threatLevel}
            </span>
            <span
              className="text-xs px-2 py-1 rounded"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-primary)',
              }}
            >
              Conviction: {briefing.convictionScore}/100
            </span>
          </div>
        </header>

        {/* Sections */}
        {sections.map((section) => (
          <section key={section.title} className="mb-8">
            <h2
              className="text-sm uppercase tracking-wider mb-3 pb-2"
              style={{
                fontFamily: 'var(--font-heading)',
                color: 'var(--text-muted)',
                letterSpacing: '0.08em',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              {section.title}
            </h2>
            <div
              className="text-base leading-relaxed"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--text-primary)' }}
            >
              {section.content}
            </div>
          </section>
        ))}

        {/* Data Snapshot at time of briefing */}
        {dataSnapshot && (
          <div
            className="mt-10 pt-6 grid grid-cols-2 gap-x-8 gap-y-2"
            style={{ borderTop: '1px solid var(--border-primary)' }}
          >
            <h3
              className="col-span-2 text-xs uppercase tracking-wider mb-2"
              style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
            >
              Dashboard at time of briefing
            </h3>
            {[
              ['BTC Price', `$${(dataSnapshot.btcPrice || 0).toLocaleString()}`],
              ['24h Change', `${(dataSnapshot.btc24hPct || 0).toFixed(2)}%`],
              ['Fear & Greed', `${dataSnapshot.fearGreed || '—'}`],
              ['Hashrate', `${(dataSnapshot.hashrateEH || 0).toFixed(1)} EH/s`],
              ['MVRV', `${(dataSnapshot.mvrv || 0).toFixed(2)}`],
              ['DXY', `${(dataSnapshot.dxy || 0).toFixed(2)}`],
              ['Gold', `$${(dataSnapshot.gold || 0).toFixed(0)}`],
              ['VIX', `${(dataSnapshot.vix || 0).toFixed(2)}`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-1" style={{ borderBottom: '1px dotted var(--border-subtle)' }}>
                <span className="text-xs uppercase" style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span className="text-xs" style={{ fontFamily: 'var(--font-data)', color: 'var(--text-primary)' }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Headlines at time of briefing */}
        {headlines.length > 0 && (
          <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border-primary)' }}>
            <h3
              className="text-xs uppercase tracking-wider mb-3"
              style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
            >
              Headlines at time of briefing ({headlines.length})
            </h3>
            <ul className="space-y-1.5">
              {headlines.slice(0, 20).map((h, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{
                      backgroundColor: h.category === 'bitcoin' ? '#f7931a' :
                        h.category === 'conflict' ? '#8b2020' :
                        h.category === 'disaster' ? '#b8860b' :
                        h.category === 'economy' ? '#2a2a2a' : '#555',
                    }}
                  />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {h.title}
                    <span style={{ color: 'var(--text-muted)' }}> — {h.source}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sources */}
        {sources.length > 0 && (
          <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border-primary)' }}>
            <h3
              className="text-xs uppercase tracking-wider mb-3"
              style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
            >
              Sources ({sources.length})
            </h3>
            <ul className="space-y-1">
              {sources.map((s, i) => (
                <li key={i}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs hover:underline"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    {s.title || s.url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Prev / Next navigation */}
        <nav
          className="mt-10 pt-6 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border-primary)' }}
        >
          {prevBriefing ? (
            <a
              href={`/briefing/${prevBriefing.date.toISOString().split('T')[0]}`}
              className="text-sm hover:underline"
              style={{ color: 'var(--accent-primary)' }}
            >
              ← Previous briefing
            </a>
          ) : <span />}

          <a
            href="/briefings"
            className="text-xs uppercase tracking-wider hover:underline"
            style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
          >
            Archive
          </a>

          {nextBriefing ? (
            <a
              href={`/briefing/${nextBriefing.date.toISOString().split('T')[0]}`}
              className="text-sm hover:underline"
              style={{ color: 'var(--accent-primary)' }}
            >
              Next briefing →
            </a>
          ) : <span />}
        </nav>
      </article>
    </div>
  );
}
