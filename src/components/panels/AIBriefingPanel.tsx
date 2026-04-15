'use client';

import { useState, useEffect, useCallback } from 'react';
import { PanelLoading } from './shared';
import { BlurGate } from '@/components/auth/BlurGate';
import { BriefingMarkdown } from '@/components/briefings/BriefingMarkdown';

interface BriefingData {
  date: string;
  headline: string;
  threatLevel: string;
  convictionScore: number;
  sections: {
    market: string;
    network: string;
    geopolitical: string;
    macro: string;
    outlook: string;
  };
}

// Compact paragraph style for the dashboard panel — smaller than the full
// briefing detail page. Matches the prior `text-sm leading-relaxed` look.
const PANEL_PARA_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize:   '14px',
  lineHeight: 1.625,
  color:      'var(--text-primary)',
};

const SECTIONS: { key: keyof BriefingData['sections']; label: string }[] = [
  { key: 'outlook', label: 'Outlook' },
  { key: 'market', label: 'Market' },
  { key: 'network', label: 'Network' },
  { key: 'geopolitical', label: 'Geopolitical' },
  { key: 'macro', label: 'Macro' },
];

export function AIBriefingPanel() {
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('outlook');
  const [error, setError] = useState<string | null>(null);

  const fetchBriefing = useCallback(async () => {
    try {
      const res = await fetch('/api/briefing/latest');
      if (res.ok) {
        const data = await res.json();
        if (data.sections) {
          setBriefing(data);
          setError(null);
        }
      }
    } catch {
      // No briefing available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/briefing/generate', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        await fetchBriefing();
      } else {
        setError(data.error || 'Generation failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <PanelLoading />;

  if (!briefing) {
    return (
      <div className="py-4">
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-heading)' }}>
          No briefing available yet.
        </p>
        <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
          Briefings generate daily at 00:00 CET. You can also trigger one manually.
        </p>
        {error && (
          <p className="text-xs mb-2" style={{ color: 'var(--accent-danger)' }}>{error}</p>
        )}
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-3 py-1.5 rounded text-xs"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--bg-primary)',
            opacity: generating ? 0.6 : 1,
          }}
        >
          {generating ? 'Generating...' : 'Generate Briefing Now'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Section tabs */}
      <div className="flex gap-1 mb-2 flex-wrap shrink-0">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveSection(s.key)}
            className="px-2 py-0.5 rounded text-xs transition-colors"
            style={{
              backgroundColor: activeSection === s.key ? 'var(--bg-secondary)' : 'transparent',
              color: activeSection === s.key ? 'var(--text-primary)' : 'var(--text-muted)',
              border: activeSection === s.key ? '1px solid var(--border-primary)' : '1px solid transparent',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Active section content — Outlook is free; all other sections require General tier */}
      {activeSection === 'outlook' ? (
        <div className="flex-1 overflow-y-auto" style={{ minHeight: '80px' }}>
          <BriefingMarkdown
            content={briefing.sections.outlook || 'Section not available.'}
            paragraphStyle={PANEL_PARA_STYLE}
          />
        </div>
      ) : (
        <BlurGate requiredTier="general" featureName="AI Intelligence">
          <div className="flex-1 overflow-y-auto" style={{ minHeight: '80px' }}>
            <BriefingMarkdown
              content={briefing.sections[activeSection as keyof BriefingData['sections']] || 'Section not available.'}
              paragraphStyle={PANEL_PARA_STYLE}
            />
          </div>
        </BlurGate>
      )}

      {/* Archive link */}
      <a
        href={`/briefing/${briefing.date}`}
        className="block text-xs mt-2 shrink-0 hover:underline"
        style={{ color: 'var(--accent-primary)' }}
      >
        Full briefing →
      </a>
    </div>
  );
}
