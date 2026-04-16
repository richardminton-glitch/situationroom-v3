'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/layout/AuthProvider';
import { SituationMap } from '@/components/map/SituationMap';
import Link from 'next/link';

interface CountryRecord {
  isoNumeric: number;
  countryCode: string;
  countryName: string;
  [key: string]: unknown;
}

export default function MapPage() {
  const { user, loading: authLoading } = useAuth();
  const [countries, setCountries] = useState<CountryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/data/country-data')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCountries(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
          }}
        >
          Loading situation map...
        </span>
      </div>
    );
  }

  // Unauthenticated: show frosted preview with sign-in prompt
  if (!user) {
    return (
      <div className="relative w-full h-full overflow-hidden">
        {/* Map renders behind the frost */}
        <div className="w-full h-full" style={{ filter: 'blur(6px)', pointerEvents: 'none' }}>
          <SituationMap countries={countries} />
        </div>

        {/* Frosted overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'rgba(245,240,232,0.55)', backdropFilter: 'blur(8px)' }}
        >
          <div
            style={{
              textAlign: 'center',
              maxWidth: 360,
              padding: '40px 32px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-primary)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            }}
          >
            <div
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '16px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-primary)',
                marginBottom: 8,
              }}
            >
              Global Situation Map
            </div>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                lineHeight: 1.7,
                color: 'var(--text-secondary)',
                marginBottom: 24,
              }}
            >
              Choropleth intelligence across 55 territories — economic, demographic, social, environment and governance metrics with interactive detail panels.
            </p>
            <Link
              href="/login"
              style={{
                display: 'inline-block',
                padding: '8px 28px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--bg-primary)',
                background: 'var(--accent-primary)',
                border: 'none',
                textDecoration: 'none',
              }}
            >
              Sign In to Access
            </Link>
            <div
              style={{
                marginTop: 12,
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                color: 'var(--text-muted)',
                letterSpacing: '0.06em',
              }}
            >
              FREE TIER AND ABOVE
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <SituationMap countries={countries} />;
}
