/**
 * ModuleSchema — emits a JSON-LD Article block for a Vienna School module.
 *
 * Mounted inside each module page so search engines and social-card
 * scrapers can read the structured data. Server-rendered as a `<script
 * type="application/ld+json">` tag inside the document body.
 *
 * `headline`, `description`, `image` and `url` are populated from the
 * module data + the canonical site origin.
 */

import type { VsModule } from '@/content/vienna-school/types';

const SITE_ORIGIN = 'https://v3.situationroom.space';

export function ModuleSchema({ module: m }: { module: VsModule }) {
  const url = `${SITE_ORIGIN}/vienna-school/${m.slug}`;
  const json = {
    '@context':       'https://schema.org',
    '@type':          'Article',
    headline:         m.title,
    alternativeHeadline: m.subtitle,
    description:      m.coldOpen.replace(/\*([^*]+)\*/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1').slice(0, 220),
    image:            `${url}/opengraph-image`,
    url,
    isPartOf: {
      '@type':  'EducationalOccupationalCredential',
      name:     'The Vienna School',
      url:      `${SITE_ORIGIN}/vienna-school`,
    },
    author: {
      '@type': 'Organization',
      name:    'The Situation Room',
      url:     SITE_ORIGIN,
    },
    publisher: {
      '@type': 'Organization',
      name:    'The Situation Room',
      url:     SITE_ORIGIN,
    },
    inLanguage: 'en-GB',
    learningResourceType: 'Online Course Module',
    educationalLevel: 'Adult Education',
    position: m.number,
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
