/**
 * /vienna-school/knowledge-problem — Module 5.
 *
 * General-tier module per spec. For Session 2 the page is fully accessible;
 * tier-gating wiring (cold-open + first interactive for free, gate the
 * rest) lands in Session 6 polish.
 */

import { ModuleLayout } from '@/components/vienna-school/ModuleLayout';
import { ModuleSchema } from '@/components/vienna-school/ModuleSchema';
import { MODULE_BY_SLUG } from '@/content/vienna-school';

const TITLE = 'The Knowledge Problem · The Vienna School';
const DESC  = 'Why no committee can run an economy. Hayek\'s dispersed-knowledge insight, Mises\' calculation argument, and the spontaneous order that emerges from prices. Module 5 of the Vienna School curriculum.';

export const metadata = {
  title:       TITLE,
  description: DESC,
  openGraph: { title: TITLE, description: DESC },
  twitter:    { card: 'summary_large_image' as const, title: TITLE, description: DESC },
};

export default function KnowledgeProblemModulePage() {
  const m = MODULE_BY_SLUG['knowledge-problem'];
  return (
    <>
      <ModuleSchema module={m} />
      <ModuleLayout module={m} />
    </>
  );
}
