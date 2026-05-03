import { DossierClient } from './DossierClient';

const TITLE = 'Your Dossier · The Vienna School';
const DESC  = 'Your personal Vienna School dossier — modules passed, books ticked off the reading ladder, graduation certificate.';

export const metadata = {
  title:       TITLE,
  description: DESC,
  openGraph: { title: TITLE, description: DESC },
  twitter:    { card: 'summary_large_image' as const, title: TITLE, description: DESC },
};

export default function DossierPage() {
  return <DossierClient />;
}
