import { vsOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/vienna-school/og-template';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Why Now — Module 6 of The Vienna School';

export default function Image() {
  return vsOgImage({
    eyebrow:  'MODULE 06 OF 06',
    title:    'Why Now',
    subtitle: 'A 150-year framework finds its asset.',
  });
}
