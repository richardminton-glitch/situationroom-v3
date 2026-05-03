import { vsOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/vienna-school/og-template';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Subjective Value — Module 2 of The Vienna School';

export default function Image() {
  return vsOgImage({
    eyebrow:  'MODULE 02 OF 06',
    title:    'Subjective Value',
    subtitle: 'A glass of water is worth more than a diamond. Until it isn’t.',
  });
}
