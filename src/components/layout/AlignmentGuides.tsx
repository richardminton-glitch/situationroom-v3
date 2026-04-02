'use client';

import type { GuideLine } from '@/lib/panels/useAlignmentGuides';

interface AlignmentGuidesProps {
  guides: GuideLine[];
}

export function AlignmentGuides({ guides }: AlignmentGuidesProps) {
  if (guides.length === 0) return null;

  return (
    <>
      {guides.map((g, i) =>
        g.orientation === 'vertical' ? (
          <div
            key={`v-${i}`}
            className="absolute top-0 bottom-0 pointer-events-none z-50"
            style={{
              left: g.position,
              width: '1px',
              backgroundColor: 'var(--accent-primary)',
              opacity: 0.6,
            }}
          />
        ) : (
          <div
            key={`h-${i}`}
            className="absolute left-0 right-0 pointer-events-none z-50"
            style={{
              top: g.position,
              height: '1px',
              backgroundColor: 'var(--accent-primary)',
              opacity: 0.6,
            }}
          />
        )
      )}
    </>
  );
}
