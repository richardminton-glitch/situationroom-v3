import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BriefingMarkdown } from '@/components/briefings/BriefingMarkdown';

interface Props {
  params: Promise<{ date: string }>;
}

const THREAT_COLORS: Record<string, string> = {
  LOW:      '#2a6e2a',
  GUARDED:  '#5a7e2a',
  ELEVATED: '#b8860b',
  HIGH:     '#b85020',
  SEVERE:   '#c04040',
  CRITICAL: '#ff4444',
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
  const briefing = await prisma.briefing.findUnique({
    where: { date: new Date(date) },
  });
  if (!briefing) notFound();

  const sources      = JSON.parse(briefing.sourcesJson)      as { url: string; title: string }[];
  const headlines    = JSON.parse(briefing.headlinesJson)    as { title: string; category: string; source: string }[];
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
    { key: 'market',       title: 'I. Market Conditions',    content: briefing.marketSection },
    { key: 'network',      title: 'II. Network Health',      content: briefing.networkSection },
    { key: 'geo',          title: 'III. Geopolitical Watch', content: briefing.geopoliticalSection },
    { key: 'macro',        title: 'IV. Macro Pulse',         content: briefing.macroSection },
    { key: 'outlook',      title: 'V. Outlook',              content: briefing.outlookSection },
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
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
        }}
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
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px',
      }}>
        {displayDate}
      </p>

      {/* Headline */}
      <h1 style={{
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: '26px', fontWeight: 'normal', lineHeight: 1.3,
        color: 'var(--text-primary)', marginBottom: '16px',
      }}>
        {briefing.headline}
      </h1>

      {/* Badges */}
      <div className="flex items-center gap-3 flex-wrap mb-2">
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em',
          textTransform: 'uppercase', color: threatColor,
          border: `1px solid ${threatColor}`, padding: '2px 8px',
        }}>
          Threat: {briefing.threatLevel}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--text-secondary)',
          border: '1px solid var(--border-primary)', padding: '2px 8px',
        }}>
          Conviction: {Math.round(briefing.convictionScore)}/100
        </span>
        {sources.length > 0 && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
            {sources.length} sources
          </span>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border-primary)', marginTop: '16px', marginBottom: '32px' }} />

      {/* Sections */}
      {sections.map((section, i) => (
        <section key={section.key} style={{ marginBottom: i < sections.length - 1 ? '36px' : '28px' }}>
          <h2 style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.16em',
            textTransform: 'uppercase', color: 'var(--text-muted)',
            borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '14px',
          }}>
            {section.title}
          </h2>
          <BriefingMarkdown content={section.content} />
        </section>
      ))}

      {/* Data snapshot */}
      {dataSnapshot && (
        <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '20px', marginTop: '36px' }}>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '12px',
          }}>
            Dashboard snapshot at time of briefing
          </p>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            fontFamily: 'var(--font-mono)', fontSize: '11px',
          }}>
            {[
              ['BTC Price',   `$${(dataSnapshot.btcPrice || 0).toLocaleString()}`],
              ['24h Change',  `${(dataSnapshot.btc24hPct || 0).toFixed(2)}%`],
              ['Fear & Greed',`${dataSnapshot.fearGreed || '—'}`],
              ['Hashrate',    `${(dataSnapshot.hashrateEH || 0).toFixed(1)} EH/s`],
              ['MVRV',        `${(dataSnapshot.mvrv || 0).toFixed(2)}`],
              ['Block Height',`${(dataSnapshot.blockHeight || 0).toLocaleString()}`],
              ['S&P 500',     `${(dataSnapshot.sp500 || 0).toLocaleString()}`],
              ['VIX',         `${(dataSnapshot.vix || 0).toFixed(2)}`],
              ['Gold',        `$${(dataSnapshot.gold || 0).toFixed(0)}`],
              ['DXY',         `${(dataSnapshot.dxy || 0).toFixed(2)}`],
              ['US 10Y',      `${(dataSnapshot.us10y || 0).toFixed(2)}%`],
              ['Oil',         `$${(dataSnapshot.oil || 0).toFixed(2)}`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-1.5 px-2"
                style={{ borderBottom: '1px dotted var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {label}
                </span>
                <span style={{ color: 'var(--text-primary)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Headlines */}
      {headlines.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '20px', marginTop: '28px' }}>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px',
          }}>
            News headlines at time of briefing ({headlines.length})
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {headlines.slice(0, 24).map((h, i) => (
              <li key={i} className="flex items-start gap-2 py-1"
                style={{ borderBottom: '1px dotted var(--border-subtle)' }}>
                <span className="mt-1.5 shrink-0" style={{
                  display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%',
                  backgroundColor:
                    h.category === 'bitcoin'  ? '#f7931a' :
                    h.category === 'conflict' ? '#8b2020' :
                    h.category === 'disaster' ? '#b8860b' :
                    h.category === 'economy'  ? 'var(--text-secondary)' : 'var(--text-muted)',
                }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {h.title}
                  {h.source && <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>— {h.source}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sources */}
      {sources.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '20px', marginTop: '28px' }}>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.14em',
            textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px',
          }}>
            Sources ({sources.length})
          </p>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {sources.map((s, i) => (
              <li key={i} className="flex items-baseline gap-2 py-0.5">
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', minWidth: '16px' }}>
                  {i + 1}.
                </span>
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-primary)', textDecoration: 'none' }}
                  className="hover:underline">
                  {s.title || s.url}
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Prev / Next */}
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
