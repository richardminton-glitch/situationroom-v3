/**
 * /vienna-school/sound-money — Module 3.
 *
 * Marquee module. Houses the gold-vs-M2 chart designed to be screenshotted
 * and shared with the situationroom.space watermark intact.
 */

import { ModuleLayout } from '@/components/vienna-school/ModuleLayout';
import { ModuleSchema } from '@/components/vienna-school/ModuleSchema';
import { MODULE_BY_SLUG } from '@/content/vienna-school';

const TITLE = 'Sound Money · The Vienna School';
const DESC  = 'Gold, the printing press, and the long con. The marquee chart of the Situation Room — gold above-ground stock vs USD M2, with optional Bitcoin supply and purchasing-power overlays. Module 3 of the Vienna School curriculum.';

export const metadata = {
  title:       TITLE,
  description: DESC,
  openGraph: {
    title:       TITLE,
    description: DESC,
    images:      [{ url: '/vienna-school/sound-money/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: {
    card:        'summary_large_image' as const,
    title:       TITLE,
    description: DESC,
    images:      ['/vienna-school/sound-money/opengraph-image'],
  },
};

export default function SoundMoneyModulePage() {
  const m = MODULE_BY_SLUG['sound-money'];
  return (
    <>
      <ModuleSchema module={m} />
      <ModuleLayout module={m} />
    </>
  );
}
