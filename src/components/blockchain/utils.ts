export function formatSats(sats: number): string {
  if (sats >= 1e8) return (sats / 1e8).toFixed(3) + ' BTC';
  if (sats >= 1e6) return (sats / 1e6).toFixed(2) + 'M sat';
  if (sats >= 1e3) return (sats / 1e3).toFixed(1) + 'K sat';
  return `${sats} sat`;
}

export function formatTxCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

export function minutesAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function feeRangeLabel(range: number[] | undefined): string {
  if (!range || range.length < 2) return '—';
  const lo = range[0];
  const hi = range[range.length - 1];
  const fmt = (n: number) => n < 10 ? n.toFixed(1) : Math.round(n).toString();
  return `${fmt(lo)}–${fmt(hi)}`;
}

export function medianSatVb(median: number | undefined): string {
  if (median == null) return '—';
  return median < 10 ? `~${median.toFixed(1)} sat/vB` : `~${Math.round(median)} sat/vB`;
}
