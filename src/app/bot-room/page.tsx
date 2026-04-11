'use client';

import { useState } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { useTier } from '@/hooks/useTier';
import { TIER_LABELS } from '@/lib/auth/tier';
import { usePricing, formatTierPrice } from '@/hooks/usePricing';
import Link from 'next/link';
import { TopBar } from '@/components/bot-room/TopBar';
import { StatsBar } from '@/components/bot-room/StatsBar';
import { CapitalFlowTopology } from '@/components/bot-room/CapitalFlowTopology';
import { ChartPanel } from '@/components/bot-room/ChartPanel';
import { OpsChat } from '@/components/bot-room/OpsChat';
import { MarketHeatmap } from '@/components/bot-room/MarketHeatmap';
import { PoolDonateModal } from '@/components/pool/PoolDonateModal';
import { OpsRoom } from '@/components/chat/OpsRoom';
import { useUnreadChat } from '@/hooks/useUnreadChat';
import { useIsMobile } from '@/hooks/useIsMobile';
import { C, FONT } from '@/components/bot-room/constants';

export default function BotRoomPage() {
  const { user, loading } = useAuth();
  const { canAccess } = useTier();
  const pricing = usePricing();
  const isMobile = useIsMobile();
  const [showDonate, setShowDonate] = useState(false);
  const [opsRoomOpen, setOpsRoomOpen] = useState(false);
  const { unreadCount: chatUnread } = useUnreadChat(opsRoomOpen);

  if (loading) {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: C.bgPrimary, fontFamily: FONT,
      }}>
        <p style={{ color: C.textDim, fontSize: 11, letterSpacing: '0.14em' }}>INITIALISING...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', backgroundColor: C.bgPrimary, fontFamily: FONT, padding: '40px 20px',
      }}>
        <p style={{ fontSize: 9, letterSpacing: '0.18em', color: C.textDim, marginBottom: 8 }}>SITUATION ROOM</p>
        <h1 style={{ fontFamily: FONT, fontSize: 22, color: C.textPrimary, marginBottom: 12, fontWeight: 600, letterSpacing: '0.06em' }}>
          BOT ROOM
        </h1>
        <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 24, lineHeight: 1.6, textAlign: 'center', maxWidth: 400 }}>
          Autonomous trading terminal. Live positions, capital flow topology,
          and real-time bot intelligence for authenticated members.
        </p>
        <Link href="/login" style={{
          display: 'inline-block', padding: '8px 20px', fontSize: 11, letterSpacing: '0.1em',
          backgroundColor: C.teal, color: C.bgPrimary, textDecoration: 'none', fontFamily: FONT, fontWeight: 600,
        }}>
          SIGN IN
        </Link>
      </div>
    );
  }

  const hasAccess = canAccess('members');

  return (
    <>
      {/* Scoped animation keyframes */}
      <style>{`
        @keyframes br-blink-kf {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .br-blink { animation: br-blink-kf 2s ease-in-out infinite; }
        .br-scroll::-webkit-scrollbar { width: 2px; }
        .br-scroll::-webkit-scrollbar-thumb { background: ${C.borderSoft}; }
      `}</style>

      {showDonate && <PoolDonateModal onClose={() => setShowDonate(false)} />}

      <div style={{ position: 'relative', height: '100%' }}>
        {/* Main grid — frosted when locked */}
        <div style={{
          display: 'grid',
          gridTemplateRows: isMobile ? '32px 38px auto 112px' : '32px 38px 1fr 112px',
          height: isMobile ? 'auto' : '100%',
          minHeight: isMobile ? '100%' : undefined,
          marginRight: !isMobile && opsRoomOpen ? '320px' : '0',
          transition: 'margin-right 0.2s ease',
          filter: hasAccess ? undefined : 'blur(6px)',
          pointerEvents: hasAccess ? undefined : 'none',
        }}>
          <TopBar
            onFundPool={hasAccess ? () => setShowDonate(true) : undefined}
            opsRoomOpen={opsRoomOpen}
            onToggleOpsRoom={() => setOpsRoomOpen((o) => !o)}
            chatUnread={chatUnread}
          />
          <StatsBar />
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            minHeight: 0,
            overflow: isMobile ? 'auto' : 'hidden',
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: isMobile ? undefined : 0, borderRight: isMobile ? 'none' : `1px solid ${C.border}` }}>
              <CapitalFlowTopology />
              <OpsChat />
            </div>
            <div style={{ minHeight: isMobile ? '300px' : 0, overflow: 'hidden', height: isMobile ? '300px' : '100%' }}>
              <ChartPanel />
            </div>
          </div>
          <MarketHeatmap />
        </div>

        {/* Tier gate overlay */}
        {!hasAccess && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10,
          }}>
            <div style={{
              backgroundColor: C.bgElevated, border: `1px solid ${C.borderSoft}`,
              padding: '32px 40px', textAlign: 'center', maxWidth: '360px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}>
              <div style={{ fontFamily: FONT, fontSize: '10px', letterSpacing: '0.18em', color: C.textDim, marginBottom: '8px' }}>
                BOT ROOM
              </div>
              <div style={{ fontFamily: FONT, fontSize: '14px', color: C.textPrimary, marginBottom: '12px', letterSpacing: '0.06em' }}>
                {TIER_LABELS.members} required
              </div>
              <div style={{ fontFamily: FONT, fontSize: '12px', color: C.textMuted, lineHeight: '1.7', marginBottom: '24px', maxWidth: '280px' }}>
                Autonomous trading terminal with live positions, capital flow topology, and real-time bot intelligence.
              </div>
              <Link href="/support" style={{
                display: 'inline-block', padding: '10px 28px', background: C.teal,
                color: C.bgPrimary, textDecoration: 'none', fontFamily: FONT,
                fontSize: '12px', letterSpacing: '0.12em', fontWeight: 'bold',
              }}>
                UNLOCK ⚡ — {pricing ? formatTierPrice('members', pricing) : '...'}
              </Link>
              <div style={{ marginTop: '12px', fontSize: '11px', color: C.textDim, fontFamily: FONT }}>
                30-day subscription · Cancel anytime
              </div>
            </div>
          </div>
        )}

        {/* OPS Room slide-in panel */}
        <OpsRoom open={opsRoomOpen} onClose={() => setOpsRoomOpen(false)} />
      </div>
    </>
  );
}
