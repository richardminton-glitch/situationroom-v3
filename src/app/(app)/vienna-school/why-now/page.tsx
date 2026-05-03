/**
 * /vienna-school/why-now — Module 6.
 *
 * The closing module. Houses the predictions audit — paired forecasts,
 * mainstream vs Austrian, lined up by year so the reader can scroll the
 * track record themselves and form their own view.
 */

import { ModuleLayout } from '@/components/vienna-school/ModuleLayout';
import { ModuleSchema } from '@/components/vienna-school/ModuleSchema';
import { MODULE_BY_SLUG } from '@/content/vienna-school';

const TITLE = 'Why Now · The Vienna School';
const DESC  = 'A 150-year analytical framework finds its monetary asset. The closing module of the Vienna School: paired predictions audit, the Austrian case for Bitcoin, and where the curriculum points next.';

export const metadata = {
  title:       TITLE,
  description: DESC,
  openGraph: {
    title:       TITLE,
    description: DESC,
    images:      [{ url: '/vienna-school/why-now/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: {
    card:        'summary_large_image' as const,
    title:       TITLE,
    description: DESC,
    images:      ['/vienna-school/why-now/opengraph-image'],
  },
};

export default function WhyNowModulePage() {
  const m = MODULE_BY_SLUG['why-now'];
  return (
    <>
      <ModuleSchema module={m} />
      <ModuleLayout module={m} />
    </>
  );
}
