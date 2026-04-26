/**
 * StubModule — placeholder content for modules not yet implemented.
 *
 * Phase 1 ships all six module shells with this block in their content slot.
 * Each subsequent phase replaces one stub with the real module.
 */

interface StubModuleProps {
  description: string;
  height?: number;
}

export function StubModule({ description, height = 320 }: StubModuleProps) {
  return (
    <div
      className="flex items-center justify-center border-2 border-dashed"
      style={{
        height,
        borderColor: 'var(--border-subtle)',
        backgroundColor: 'var(--bg-card)',
      }}
    >
      <p
        className="text-center px-6"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
          maxWidth: 640,
          lineHeight: 1.75,
        }}
      >
        {description}
      </p>
    </div>
  );
}
