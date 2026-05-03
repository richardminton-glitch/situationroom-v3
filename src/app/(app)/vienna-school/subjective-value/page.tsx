/**
 * /vienna-school/subjective-value — Module 2.
 *
 * Free-tier module: no account required. ModuleLayout handles render;
 * this page only resolves the data and emits SEO metadata.
 */

import { ModuleLayout } from '@/components/vienna-school/ModuleLayout';
import { ModuleSchema } from '@/components/vienna-school/ModuleSchema';
import { MODULE_BY_SLUG } from '@/content/vienna-school';

const TITLE = 'Subjective Value · The Vienna School';
const DESC  = 'Why a glass of water is worth more than a diamond — until it isn\'t. Carl Menger\'s marginalist revolution and the foundation of Austrian price theory. Module 2 of the Vienna School curriculum.';

export const metadata = {
  title:       TITLE,
  description: DESC,
  openGraph: {
    title:       TITLE,
    description: DESC,
    images:      [{ url: '/vienna-school/subjective-value/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: {
    card:        'summary_large_image' as const,
    title:       TITLE,
    description: DESC,
    images:      ['/vienna-school/subjective-value/opengraph-image'],
  },
};

export default function SubjectiveValueModulePage() {
  const m = MODULE_BY_SLUG['subjective-value'];
  return (
    <>
      <ModuleSchema module={m} />
      <ModuleLayout module={m} />
    </>
  );
}
