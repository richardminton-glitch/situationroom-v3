import { QuoteWallClient } from './QuoteWallClient';

export const metadata = {
  title:       'The Quote Wall · The Vienna School',
  description: 'Rotating Austrian aphorisms with full context. Mises, Hayek, Rothbard, Bastiat, Sowell, Greenspan and the rest — read in context, share with the situationroom.space watermark.',
};

export default function QuoteWallPage() {
  return <QuoteWallClient />;
}
