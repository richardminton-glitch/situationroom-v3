import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import type { LayoutPanelItem } from '@/lib/panels/layouts';
import { SharedDashboardClient } from './SharedDashboardClient';

export const dynamic = 'force-dynamic';

/**
 * /shared/[token] — public viewer for a VIP-shared custom dashboard.
 *
 * Not wrapped in the (app) group, so it renders without the TopBar, sidebar,
 * OpsRoom, or tier navigation. The goal is a read-only dashboard + attribution
 * strip + free-signup CTA.
 *
 * Access rules (checked on every load):
 *   - Token must exist and not be revoked.
 *   - Owner must currently be tier='vip'. If they've lapsed, show 410.
 *
 * On an authenticated view, if the share has no boundUserId yet it gets
 * bound to the caller — this is the retention path for invitees who sign up
 * via the CTA.
 */
export default async function SharedDashboardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const share = await prisma.dashboardShare.findUnique({
    where: { token },
    include: {
      layout: true,
      owner: { select: { id: true, tier: true, displayName: true, email: true } },
    },
  });

  if (!share) notFound();

  const isRevoked = share.revokedAt !== null;
  const ownerStillVip = share.owner.tier === 'vip';

  if (isRevoked || !ownerStillVip) {
    return <ExpiredViewer />;
  }

  // Opportunistic binding: first authed view claims the slot. We allow binding
  // even if the slot has an inviteEmail set — the email is advisory only.
  const session = await getSession();
  if (session && !share.boundUserId && session.user.id !== share.ownerId) {
    await prisma.dashboardShare.update({
      where: { id: share.id },
      data: { boundUserId: session.user.id, lastViewedAt: new Date() },
    });
  } else {
    // Just bump lastViewedAt
    await prisma.dashboardShare.update({
      where: { id: share.id },
      data: { lastViewedAt: new Date() },
    });
  }

  const panels = JSON.parse(share.layout.layoutJson) as LayoutPanelItem[];
  const ownerDisplay =
    share.owner.displayName?.trim() || share.owner.email.split('@')[0];

  const shareTheme = share.theme === 'dark' ? 'dark' : 'parchment';

  return (
    <SharedDashboardClient
      panels={panels}
      layoutName={share.layout.name}
      ownerDisplay={ownerDisplay}
      viewerIsAuthed={!!session}
      token={token}
      shareTheme={shareTheme}
    />
  );
}

function ExpiredViewer() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div
        style={{
          maxWidth: 440,
          padding: '32px 40px',
          textAlign: 'center',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'var(--text-muted)',
            marginBottom: 8,
          }}
        >
          SHARED DASHBOARD
        </div>
        <div
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 22,
            color: 'var(--text-primary)',
            marginBottom: 12,
          }}
        >
          This invite is no longer active
        </div>
        <div
          style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            marginBottom: 24,
            fontFamily: 'var(--font-mono)',
          }}
        >
          The person who sent you this link has either revoked access or is no
          longer on the VIP tier.
        </div>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            padding: '10px 28px',
            background: 'var(--accent-primary)',
            color: 'var(--bg-primary)',
            textDecoration: 'none',
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            letterSpacing: '0.12em',
            fontWeight: 'bold',
          }}
        >
          VISIT THE SITUATION ROOM →
        </Link>
      </div>
    </div>
  );
}
