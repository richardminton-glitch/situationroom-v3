'use client';

/**
 * /tools/cash-isa — UK Cash ISA real returns (free tier).
 *
 * Long-form personal-finance brief: 27 tax years of max-out Cash ISA
 * contributions plotted against CPI, RPI, M4 broad money and S&P 500.
 *
 * Open to anonymous visitors — this is a public-interest piece designed
 * to surface the central-bank cost of "safe" cash savings; gating it
 * would defeat the point.
 */

import { useAuth } from '@/components/layout/AuthProvider';
import { CashIsaRoom } from '@/components/cash-isa/CashIsaRoom';

const FONT_MONO = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

const fullScreenStyle: React.CSSProperties = {
  height:          '100%',
  display:         'flex',
  alignItems:      'center',
  justifyContent:  'center',
  backgroundColor: 'var(--bg-primary)',
  fontFamily:      FONT_MONO,
};

export default function CashIsaPage() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div style={fullScreenStyle}>
        <p style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.14em' }}>
          INITIALISING...
        </p>
      </div>
    );
  }

  return <CashIsaRoom />;
}
