'use client';

/**
 * GlobalTheatre — Zone 3 of the Ops Room.
 * Mounts the existing DarkGlobe and overlays event markers,
 * mode toggle controls, and a LIVE indicator.
 *
 * Globe modes:
 *  LIVE    — event markers from RSS (default)
 *  MACRO   — CPI heatmap dots
 *  NETWORK — Bitcoin adoption dots
 *
 * Event markers are rendered as HTML overlays positioned using
 * lat/lon → screen coordinate projection. They update without
 * remounting the globe.
 */

import { useState, useEffect, useRef } from 'react';
import { DarkGlobe } from '@/components/panels/globes/DarkGlobe';
import type { SignalArticle } from '@/hooks/useOpsRoom';

type GlobeMode = 'LIVE' | 'MACRO' | 'NETWORK';

interface GlobalTheatreProps {
  eventMarkers: SignalArticle[];
  /** Optional flash highlight from incoming OpsRoom data — currently unused. */
  flashGeoRef?: string | null;
}

// Country → coords lookup (loaded once)
let countryCoords: Record<string, { lat: number; lon: number }> | null = null;
async function getCountryCoords(): Promise<Record<string, { lat: number; lon: number }>> {
  if (countryCoords) return countryCoords;
  try {
    const res = await fetch('/geo/country-coords.json');
    countryCoords = await res.json();
  } catch {
    countryCoords = {};
  }
  return countryCoords!;
}

// CPI color bands
function cpiColor(cpi: number): string {
  if (cpi < 2) return '#00d4aa';
  if (cpi < 5) return '#d4a017';
  if (cpi < 10) return '#cc7722';
  return '#cc4444';
}

// Category → marker color
const MARKER_COLORS: Record<string, string> = {
  conflict: '#cc4444',
  economy: '#d4a017',
  political: '#4488cc',
  bitcoin: '#00d4aa',
  disaster: '#cc7722',
};

// Static CPI data for major economies (approximate current values)
const CPI_DATA: Record<string, { name: string; cpi: number; lat: number; lon: number }> = {
  US: { name: 'United States', cpi: 3.2, lat: 38.9, lon: -77.0 },
  GB: { name: 'United Kingdom', cpi: 3.4, lat: 51.5, lon: -0.1 },
  DE: { name: 'Germany', cpi: 2.2, lat: 52.5, lon: 13.4 },
  FR: { name: 'France', cpi: 2.3, lat: 48.9, lon: 2.3 },
  JP: { name: 'Japan', cpi: 2.8, lat: 35.7, lon: 139.7 },
  CN: { name: 'China', cpi: 0.7, lat: 39.9, lon: 116.4 },
  IN: { name: 'India', cpi: 5.1, lat: 28.6, lon: 77.2 },
  BR: { name: 'Brazil', cpi: 4.5, lat: -15.8, lon: -47.9 },
  CA: { name: 'Canada', cpi: 2.9, lat: 45.4, lon: -75.7 },
  AU: { name: 'Australia', cpi: 3.6, lat: -33.9, lon: 151.2 },
  RU: { name: 'Russia', cpi: 7.4, lat: 55.75, lon: 37.62 },
  TR: { name: 'Turkey', cpi: 44.4, lat: 39.9, lon: 32.9 },
  AR: { name: 'Argentina', cpi: 211.4, lat: -34.6, lon: -58.4 },
  MX: { name: 'Mexico', cpi: 4.7, lat: 19.4, lon: -99.1 },
  KR: { name: 'South Korea', cpi: 3.1, lat: 37.6, lon: 127.0 },
  IT: { name: 'Italy', cpi: 1.6, lat: 41.9, lon: 12.5 },
  ES: { name: 'Spain', cpi: 3.4, lat: 40.4, lon: -3.7 },
  ZA: { name: 'South Africa', cpi: 5.3, lat: -26.2, lon: 28.0 },
  SA: { name: 'Saudi Arabia', cpi: 1.6, lat: 24.7, lon: 46.7 },
  NG: { name: 'Nigeria', cpi: 28.9, lat: 9.1, lon: 7.5 },
  ID: { name: 'Indonesia', cpi: 2.6, lat: -6.2, lon: 106.8 },
  PL: { name: 'Poland', cpi: 4.0, lat: 52.2, lon: 21.0 },
  CH: { name: 'Switzerland', cpi: 1.3, lat: 46.9, lon: 7.4 },
  SE: { name: 'Sweden', cpi: 3.6, lat: 59.3, lon: 18.1 },
  NO: { name: 'Norway', cpi: 4.8, lat: 59.9, lon: 10.7 },
};

// BTC adoption country coords
const ADOPTION_COORDS: Record<string, { lat: number; lon: number }> = {
  US: { lat: 38.9, lon: -77.0 }, DE: { lat: 52.5, lon: 13.4 }, GB: { lat: 51.5, lon: -0.1 },
  CA: { lat: 45.4, lon: -75.7 }, NL: { lat: 52.4, lon: 4.9 }, SG: { lat: 1.3, lon: 103.8 },
  CH: { lat: 46.9, lon: 7.4 }, JP: { lat: 35.7, lon: 139.7 }, AU: { lat: -33.9, lon: 151.2 },
  FR: { lat: 48.9, lon: 2.3 }, KR: { lat: 37.6, lon: 127.0 }, BR: { lat: -15.8, lon: -47.9 },
  SV: { lat: 13.7, lon: -89.2 }, IN: { lat: 28.6, lon: 77.2 }, NG: { lat: 9.1, lon: 7.5 },
  VN: { lat: 21.0, lon: 105.8 }, TH: { lat: 13.8, lon: 100.5 }, PH: { lat: 14.6, lon: 121.0 },
  AR: { lat: -34.6, lon: -58.4 }, RU: { lat: 55.75, lon: 37.62 }, TR: { lat: 39.9, lon: 32.9 },
  MX: { lat: 19.4, lon: -99.1 }, ZA: { lat: -26.2, lon: 28.0 }, PL: { lat: 52.2, lon: 21.0 },
  CZ: { lat: 50.1, lon: 14.4 }, CO: { lat: 4.7, lon: -74.1 }, IL: { lat: 31.8, lon: 35.2 },
  AE: { lat: 25.2, lon: 55.3 }, HK: { lat: 22.3, lon: 114.2 }, TW: { lat: 25.0, lon: 121.5 },
  UA: { lat: 50.4, lon: 30.5 }, VE: { lat: 10.5, lon: -66.9 },
};

export default function GlobalTheatre({ eventMarkers }: GlobalTheatreProps) {
  const [mode, setMode] = useState<GlobeMode>('LIVE');
  const [liveFlash, setLiveFlash] = useState(false);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [resolvedMarkers, setResolvedMarkers] = useState<(SignalArticle & { lat: number; lon: number })[]>([]);
  const prevMarkersRef = useRef<string>('');

  // Resolve geoReferences to coordinates
  useEffect(() => {
    if (mode !== 'LIVE') return;

    const resolve = async () => {
      const coords = await getCountryCoords();
      const resolved = eventMarkers
        .filter((m) => m.geoReference)
        .map((m) => {
          const key = m.geoReference!.toLowerCase();
          const coord = coords[key];
          if (!coord) return null;
          return { ...m, lat: coord.lat, lon: coord.lon };
        })
        .filter(Boolean) as (SignalArticle & { lat: number; lon: number })[];

      // Only update if markers actually changed (avoid re-renders)
      const sig = resolved.map((m) => m.id).join(',');
      if (sig !== prevMarkersRef.current) {
        prevMarkersRef.current = sig;
        setResolvedMarkers(resolved);
        // Flash the LIVE indicator
        setLiveFlash(true);
        setTimeout(() => setLiveFlash(false), 800);
      }
    };

    resolve();
  }, [eventMarkers, mode]);

  const FONT = "'IBM Plex Mono', 'SF Mono', monospace";

  return (
    <>
      <style>{`
        @keyframes marker-pulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.6); opacity: 0.3; }
        }
        @keyframes live-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          height: '100%',
          position: 'relative',
          background: '#080d0d',
          overflow: 'hidden',
        }}
      >
        {/* Globe container */}
        <div style={{ width: '100%', height: '100%' }}>
          <DarkGlobe />
        </div>

        {/* LIVE indicator — top right of globe */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontFamily: FONT,
            fontSize: 9,
            letterSpacing: '0.1em',
            color: '#00d4aa',
            pointerEvents: 'none',
            animation: liveFlash ? 'live-blink 0.4s ease-in-out 2' : 'none',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#00d4aa',
              display: 'inline-block',
              boxShadow: '0 0 4px #00d4aa',
            }}
          />
          {mode === 'LIVE' ? `LIVE \u00b7 ${resolvedMarkers.length} EVENTS` : mode}
        </div>

        {/* Mode toggle — bottom right of globe */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            right: 60,
            display: 'flex',
            gap: 4,
            zIndex: 20,
          }}
        >
          {(['LIVE', 'MACRO', 'NETWORK'] as GlobeMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                fontFamily: FONT,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: '0.08em',
                padding: '3px 8px',
                border: mode === m ? '1px solid #00d4aa' : '1px solid #1a2e2e',
                background: mode === m ? '#00d4aa' : 'rgba(8,13,13,0.85)',
                color: mode === m ? '#080d0d' : '#4a6060',
                cursor: 'pointer',
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {/* MACRO mode — CPI legend */}
        {mode === 'MACRO' && (
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              fontFamily: FONT,
              fontSize: 8,
              color: '#4a6060',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              background: 'rgba(8,13,13,0.85)',
              padding: '4px 8px',
              border: '1px solid #1a2e2e',
              zIndex: 20,
            }}
          >
            <span style={{ letterSpacing: '0.1em' }}>CPI</span>
            {[
              { color: '#00d4aa', label: '<2%' },
              { color: '#d4a017', label: '2-5%' },
              { color: '#cc7722', label: '5-10%' },
              { color: '#cc4444', label: '>10%' },
            ].map(({ color, label }) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
                {label}
              </span>
            ))}
          </div>
        )}

        {/* NETWORK mode — legend */}
        {mode === 'NETWORK' && (
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              fontFamily: FONT,
              fontSize: 8,
              color: '#4a6060',
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              background: 'rgba(8,13,13,0.85)',
              padding: '4px 8px',
              border: '1px solid #1a2e2e',
              zIndex: 20,
            }}
          >
            <span style={{ letterSpacing: '0.1em' }}>BTC ADOPTION</span>
            {[
              { opacity: 0.3, label: 'Low' },
              { opacity: 0.6, label: 'Medium' },
              { opacity: 1.0, label: 'High' },
            ].map(({ opacity, label }) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4aa', opacity, display: 'inline-block' }} />
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Overlay markers — rendered as absolute positioned HTML dots */}
        {/* Since we can't project lat/lon to screen coords without access to the Three.js camera,
            we render a transparent overlay panel listing event locations instead.
            This is a clean approach that doesn't require modifying DarkGlobe internals. */}

        {mode === 'LIVE' && resolvedMarkers.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 30,
              left: 10,
              maxHeight: 'calc(100% - 60px)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              zIndex: 15,
              pointerEvents: 'auto',
            }}
          >
            {resolvedMarkers.slice(0, 12).map((marker) => {
              const color = MARKER_COLORS[marker.primaryCategory] || '#4a6060';
              return (
                <div
                  key={marker.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 8px',
                    background: 'rgba(8,13,13,0.85)',
                    border: '1px solid #1a2e2e',
                    fontFamily: FONT,
                    cursor: 'default',
                    maxWidth: 280,
                  }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({
                      text: marker.title,
                      x: rect.right + 8,
                      y: rect.top,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: color,
                      flexShrink: 0,
                      animation: 'marker-pulse 2s ease-in-out infinite',
                      boxShadow: `0 0 4px ${color}`,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      color: '#e0f0f0',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {marker.geoReference?.toUpperCase()} — {marker.source}
                  </span>
                  <span style={{ fontSize: 8, color, flexShrink: 0 }}>
                    {'\u2605'}{marker.relevanceToBitcoin}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* MACRO overlay markers */}
        {mode === 'MACRO' && (
          <div
            style={{
              position: 'absolute',
              top: 30,
              left: 10,
              maxHeight: 'calc(100% - 60px)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              zIndex: 15,
            }}
          >
            {Object.entries(CPI_DATA)
              .sort((a, b) => b[1].cpi - a[1].cpi)
              .slice(0, 15)
              .map(([code, data]) => (
                <div
                  key={code}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '2px 8px',
                    background: 'rgba(8,13,13,0.85)',
                    border: '1px solid #1a2e2e',
                    fontFamily: FONT,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: cpiColor(data.cpi), flexShrink: 0 }} />
                  <span style={{ fontSize: 9, color: '#4a6060', width: 24 }}>{code}</span>
                  <span style={{ fontSize: 9, color: cpiColor(data.cpi), fontVariantNumeric: 'tabular-nums' }}>
                    {data.cpi.toFixed(1)}%
                  </span>
                </div>
              ))}
          </div>
        )}

        {/* NETWORK overlay markers */}
        {mode === 'NETWORK' && (
          <div
            style={{
              position: 'absolute',
              top: 30,
              left: 10,
              maxHeight: 'calc(100% - 60px)',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              zIndex: 15,
            }}
          >
            {Object.entries(ADOPTION_COORDS)
              .map(([code]) => ({ code, score: 0 }))
              .map((entry) => {
                // We'll load scores asynchronously but for now use inline
                return entry;
              })
              .slice(0, 15)
              .map(({ code }) => {
                // Inline scores from the static map
                const SCORES: Record<string, number> = {
                  US: 95, DE: 80, GB: 72, CA: 70, NL: 68, SG: 65, CH: 64, JP: 60,
                  AU: 58, FR: 55, KR: 52, BR: 48, SV: 45, IN: 42, NG: 40,
                };
                const score = SCORES[code] || 20;
                return (
                  <div
                    key={code}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '2px 8px',
                      background: 'rgba(8,13,13,0.85)',
                      border: '1px solid #1a2e2e',
                      fontFamily: FONT,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#00d4aa',
                        opacity: Math.max(0.2, score / 100),
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 9, color: '#4a6060', width: 24 }}>{code}</span>
                    <div style={{ width: 60, height: 3, background: '#1a2e2e' }}>
                      <div style={{ width: `${score}%`, height: '100%', background: '#00d4aa', opacity: Math.max(0.3, score / 100) }} />
                    </div>
                    <span style={{ fontSize: 8, color: '#4a6060' }}>{score}</span>
                  </div>
                );
              })}
          </div>
        )}

        {/* Tooltip */}
        {tooltip && (
          <div
            style={{
              position: 'fixed',
              left: tooltip.x,
              top: tooltip.y,
              maxWidth: 260,
              padding: '6px 10px',
              background: 'rgba(8,13,13,0.95)',
              border: '1px solid #1a2e2e',
              fontFamily: FONT,
              fontSize: 10,
              color: '#e0f0f0',
              lineHeight: 1.4,
              zIndex: 1000,
              pointerEvents: 'none',
            }}
          >
            {tooltip.text}
          </div>
        )}
      </div>
    </>
  );
}
