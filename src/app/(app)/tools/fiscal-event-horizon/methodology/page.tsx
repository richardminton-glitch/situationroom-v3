/**
 * /tools/fiscal-event-horizon/methodology
 *
 * Full methodology document — all six modules' derivations, sources, and
 * editorial notes concatenated under a single classified-document chrome.
 * The credibility artefact: the document a critic links to when arguing
 * about a specific number on the page.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { ClassificationBar } from '@/components/feh/ClassificationBar';
import { DocumentMetadata } from '@/components/feh/DocumentMetadata';
import { MethodologyContent } from '@/components/feh/MethodologyContent';
import { METHODOLOGY } from '@/lib/feh/methodology-content';

export const metadata: Metadata = {
  title: 'Fiscal Event Horizon — Methodology · The Situation Room',
  description:
    'Full derivation, sources, and editorial notes for all six modules of the Fiscal Event Horizon dossier — runway calculation, RCDI weights, divergence index, malinvestment composite, wartime stage classification, petro-dollar indexing.',
};

export default function MethodologyPage() {
  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      <ClassificationBar />
      <DocumentMetadata
        docRef="FEH-METHODOLOGY-2026Q2"
        compiled="1430Z 26APR26"
        nextReview="26JUL26"
      />

      {/* Breadcrumb + page title */}
      <div className="mx-auto max-w-[920px] px-4 pt-6">
        <div
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 10,
            letterSpacing: '0.18em',
            color: 'var(--text-muted)',
          }}
        >
          <Link href="/tools/fiscal-event-horizon" style={{ color: 'inherit', textDecoration: 'none' }}>
            ← FISCAL EVENT HORIZON
          </Link>
          {' · METHODOLOGY DOCUMENT'}
        </div>
        <h1
          className="mt-4"
          style={{
            fontFamily: 'var(--feh-font-display)',
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 600,
            letterSpacing: '0.14em',
            color: 'var(--feh-stencil-ink)',
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          METHODOLOGY
        </h1>
        <p
          className="mt-3 italic"
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 12,
            lineHeight: 1.7,
            letterSpacing: '0.04em',
            color: 'var(--text-secondary)',
            maxWidth: 720,
          }}
        >
          Every number on the Fiscal Event Horizon page is derivable from a
          public source plus an editorial choice. This document records both.
          When a number changes, the source and choice change with it.
        </p>
      </div>

      {/* Table of contents */}
      <nav
        className="mx-auto max-w-[920px] px-4 mt-8 mb-4 border-y py-4"
        style={{ borderColor: 'var(--border-primary)' }}
        aria-label="Methodology contents"
      >
        <div
          style={{
            fontFamily: 'var(--feh-font-mono)',
            fontSize: 9,
            letterSpacing: '0.22em',
            color: 'var(--text-muted)',
            marginBottom: 6,
          }}
        >
          CONTENTS
        </div>
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-6">
          {METHODOLOGY.map((m) => (
            <li key={m.slug}>
              <a
                href={`#m-${m.slug}`}
                style={{
                  fontFamily: 'var(--feh-font-mono)',
                  fontSize: 11,
                  letterSpacing: '0.06em',
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                  display: 'flex',
                  gap: 10,
                }}
              >
                <span style={{ color: 'var(--text-muted)', minWidth: 28 }}>{m.index}</span>
                <span>{m.title}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* All six entries stacked */}
      <main className="mx-auto max-w-[920px] px-4 pb-16">
        {METHODOLOGY.map((m, i) => (
          <div
            key={m.slug}
            style={{
              borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)',
              paddingTop: i === 0 ? 0 : 32,
              marginTop: i === 0 ? 8 : 32,
            }}
          >
            <div
              style={{
                fontFamily: 'var(--feh-font-mono)',
                fontSize: 10,
                letterSpacing: '0.22em',
                color: 'var(--feh-critical)',
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              ITEM {m.index}
            </div>
            <MethodologyContent entry={m} anchorId={`m-${m.slug}`} />
          </div>
        ))}
      </main>

      <div
        className="border-t py-8 px-4 text-center"
        style={{
          borderColor: 'var(--border-primary)',
          fontFamily: 'var(--feh-font-mono)',
          fontSize: 10,
          letterSpacing: '0.16em',
          color: 'var(--text-muted)',
          lineHeight: 2,
        }}
      >
        END OF METHODOLOGY DOCUMENT
        <br />
        <span style={{ opacity: 0.6 }}>
          COMPILED FROM PUBLIC DATA AND EDITORIAL JUDGEMENT — SITUATION ROOM INTELLIGENCE
        </span>
      </div>

      <ClassificationBar />
    </div>
  );
}
