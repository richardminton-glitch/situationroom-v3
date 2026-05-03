import { vsOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/vienna-school/og-template';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'Time Preference — Module 4 of The Vienna School';

export default function Image() {
  return vsOgImage({
    eyebrow:  'MODULE 04 OF 06',
    title:    'Time Preference',
    subtitle: 'Capital, interest, and the structure of production.',
  });
}
