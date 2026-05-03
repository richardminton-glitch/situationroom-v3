import { vsOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/vienna-school/og-template';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'The Origin — Module 1 of The Vienna School';

export default function Image() {
  return vsOgImage({
    eyebrow:  'MODULE 01 OF 06',
    title:    'The Origin',
    subtitle: 'Vienna, 1871. A line of thought begins.',
  });
}
