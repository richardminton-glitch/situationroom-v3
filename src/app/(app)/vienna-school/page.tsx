import { VienneSchoolIndexClient } from './IndexClient';

const TITLE = 'The Vienna School · The Situation Room';
const DESC  = 'A six-module Austrian economics curriculum. Subjective value, sound money, time preference, the knowledge problem — the analytical lens that makes everything else in the Situation Room make sense. Free to read.';

export const metadata = {
  title:       TITLE,
  description: DESC,
  openGraph: { title: TITLE, description: DESC },
  twitter:    { card: 'summary_large_image' as const, title: TITLE, description: DESC },
};

export default function VienneSchoolIndexPage() {
  return <VienneSchoolIndexClient />;
}
