import { vsOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/vienna-school/og-template';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'The Knowledge Problem — Module 5 of The Vienna School';

export default function Image() {
  return vsOgImage({
    eyebrow:  'MODULE 05 OF 06',
    title:    'The Knowledge Problem',
    subtitle: 'Why no committee can run an economy.',
  });
}
