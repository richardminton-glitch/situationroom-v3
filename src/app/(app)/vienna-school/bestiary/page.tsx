import { BestiaryClient } from './BestiaryClient';

export const metadata = {
  title:       'The Bestiary · The Vienna School',
  description: 'A glossary of Austrian-school terms — praxeology, catallactics, Cantillon effect, marginal utility, malinvestment, knowledge problem, spontaneous order, and the rest. Searchable.',
};

export default function BestiaryPage() {
  return <BestiaryClient />;
}
