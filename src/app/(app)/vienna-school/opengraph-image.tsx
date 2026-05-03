import { vsOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/vienna-school/og-template';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'The Vienna School — six-module Austrian economics curriculum on the Situation Room';

export default function Image() {
  return vsOgImage({
    eyebrow:  'CURRICULUM · 6 MODULES',
    title:    'The Vienna School',
    subtitle: 'A six-module Austrian economics curriculum — the lens that makes everything else make sense.',
    footer:   'BEGIN AT MODULE 01',
  });
}
