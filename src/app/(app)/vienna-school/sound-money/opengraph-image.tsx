import { vsOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/vienna-school/og-template';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Sound Money — Module 3 of The Vienna School';

export default function Image() {
  return vsOgImage({
    eyebrow:  'MODULE 03 OF 06',
    title:    'Sound Money',
    subtitle: 'Gold, the printing press, and the long con.',
  });
}
