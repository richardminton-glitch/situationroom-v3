'use client';

const FONT = "'JetBrains Mono', 'IBM Plex Mono', 'SF Mono', monospace";

interface Props {
  btcPrice:  number;
  timestamp: string;
}

export function PageHeader({ btcPrice, timestamp }: Props) {
  const updatedTime = new Date(timestamp).toUTCString().replace(/:\d\d GMT/, ' UTC');
  const shortTime   = new Date(timestamp).toISOString().slice(11, 16) + ' UTC';
  const today       = new Date().toLocaleDateString('en-GB', {
    day:   'numeric',
    month: 'short',
    year:  'numeric',
  }).toUpperCase();

  const priceFormatted = btcPrice.toLocaleString('en-US', {
    style:               'currency',
    currency:            'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  void updatedTime; // suppress unused var warning — shortTime is used instead

  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      paddingBottom:  16,
      borderBottom:   '1px solid rgba(255,255,255,0.06)',
      fontFamily:     FONT,
    }}>

      {/* Left — page identity */}
      <span style={{
        fontSize: 11,
        letterSpacing: '0.18em',
        color:         '#00d4c8',
        fontWeight:    600,
      }}>
        DCA SIGNAL ENGINE
      </span>

      {/* Centre — BTC price */}
      <span style={{
        fontSize: 17,
        letterSpacing: '0.04em',
        color:         '#e8edf2',
        fontWeight:    500,
      }}>
        {priceFormatted}
        <span style={{ fontSize: 11, color: '#8a9bb0', marginLeft: 6, letterSpacing: '0.1em' }}>
          BTC/USD
        </span>
      </span>

      {/* Right — date + last updated */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <span style={{ fontSize: 11, color: '#8a9bb0', letterSpacing: '0.1em' }}>{today}</span>
        <span style={{ fontSize: 11, color: '#6b7a8d', letterSpacing: '0.1em' }}>
          UPDATED {shortTime}
        </span>
      </div>

    </div>
  );
}
