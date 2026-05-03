/**
 * /vienna-school/origin — Module 1.
 *
 * Free-tier module: no account required. The ModuleLayout component owns
 * the rendering; this page just resolves the data and mounts it.
 */

import { ModuleLayout } from '@/components/vienna-school/ModuleLayout';
import { ModuleSchema } from '@/components/vienna-school/ModuleSchema';
import { MODULE_BY_SLUG } from '@/content/vienna-school';

const TITLE = 'The Origin · The Vienna School';
const DESC  = 'Vienna, 1871. Carl Menger publishes Principles of Economics and a 150-year intellectual lineage begins. Module 1 of the Situation Room\'s Vienna School curriculum.';

// openGraph.images and twitter.images intentionally omitted — Next 16's
// file-convention `opengraph-image.tsx` injects the hashed URL into both
// at build time. Specifying images here would override the convention
// with a literal (un-hashed) path that returns 404.
export const metadata = {
  title:       TITLE,
  description: DESC,
  openGraph: {
    title:       TITLE,
    description: DESC,
  },
  twitter: {
    card:        'summary_large_image' as const,
    title:       TITLE,
    description: DESC,
  },
};

export default function OriginModulePage() {
  const m = MODULE_BY_SLUG['origin'];
  return (
    <>
      <ModuleSchema module={m} />
      <ModuleLayout module={m} />
    </>
  );
}
