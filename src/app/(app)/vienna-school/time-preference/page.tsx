/**
 * /vienna-school/time-preference — Module 4.
 *
 * The conceptually demanding module. Houses the Hayekian triangle —
 * an interactive visualisation of how central-bank interest-rate
 * suppression distorts the structure of capital and produces the
 * Austrian Business Cycle.
 */

import { ModuleLayout } from '@/components/vienna-school/ModuleLayout';
import { ModuleSchema } from '@/components/vienna-school/ModuleSchema';
import { MODULE_BY_SLUG } from '@/content/vienna-school';

const TITLE = 'Time Preference · The Vienna School';
const DESC  = 'Capital, interest, and the Hayekian triangle. The interactive lets you play central bank: suppress the interest rate, watch malinvestment accumulate as the structure of production distorts, then crash the system. Module 4 of the Vienna School curriculum.';

export const metadata = {
  title:       TITLE,
  description: DESC,
  openGraph: { title: TITLE, description: DESC },
  twitter:    { card: 'summary_large_image' as const, title: TITLE, description: DESC },
};

export default function TimePreferenceModulePage() {
  const m = MODULE_BY_SLUG['time-preference'];
  return (
    <>
      <ModuleSchema module={m} />
      <ModuleLayout module={m} />
    </>
  );
}
