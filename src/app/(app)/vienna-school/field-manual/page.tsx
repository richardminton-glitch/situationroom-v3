import { FieldManualClient } from './FieldManualClient';

const TITLE = 'Field Manual · The Vienna School';
const DESC  = 'The full Vienna School curriculum as a single long-form document. Read through, or Cmd/Ctrl-P to save as PDF.';

export const metadata = {
  title:       TITLE,
  description: DESC,
  openGraph: { title: TITLE, description: DESC },
  twitter:    { card: 'summary_large_image' as const, title: TITLE, description: DESC },
};

export default function FieldManualPage() {
  return <FieldManualClient />;
}
