/**
 * Module 1 — The Origin.
 *
 * The 1871 Viennese coffee-house lineage of Austrian economics.
 * Free tier: fully accessible.
 */

import type { VsModule } from '../types';

export const originModule: VsModule = {
  slug:     'origin',
  number:   1,
  title:    'The Origin',
  subtitle: 'Vienna, 1871. A line of thought begins.',

  heroImage:    '/images/vienna-school/module-1-origin-hero.png',
  heroImageAlt: 'Three economists in a late-19th-century Viennese coffee house, locked in argument.',

  coldOpen:
    "In 1871, a quiet university lecturer in Vienna published a slim book that mainstream " +
    "economics still hasn't fully absorbed. Carl Menger's *Principles of Economics* didn't " +
    "land like a thunderclap. It landed in seminar rooms and coffee houses, where a small " +
    "circle of thinkers began rebuilding the foundations of the discipline from scratch — " +
    "not on aggregates and equilibria, but on the choices of individual human beings. The " +
    "tradition they founded would spend the next 150 years being ignored, ridiculed, and " +
    "vindicated, often in that order.",

  coreArgument: [
    "The Vienna School — Austrian economics — is not a national school in any meaningful " +
    "sense today. It is a methodological one. It begins from the premise that economic " +
    "phenomena are the unintended consequence of purposeful action by individuals, and " +
    "that you cannot understand them by aggregating people into mathematical wholes. " +
    "There is no \"the economy\" that acts. There are only people, acting.",

    "From this seemingly modest starting point flows everything else: the subjective " +
    "theory of value (Module 2), the case for sound money (Module 3), the centrality of " +
    "time and capital structure (Module 4), the impossibility of central planning " +
    "(Module 5), and — eventually — the discovery that a digitally scarce monetary asset " +
    "fits the framework better than gold ever did (Module 6).",

    "The lineage matters because each generation refined the arguments under fire. Menger " +
    "started it. Böhm-Bawerk took on Marx and won. Mises wrote the systematic treatise. " +
    "Hayek made the case readable to the post-war public and won a Nobel for it. Rothbard " +
    "radicalised the politics. Hoppe sharpened the philosophy. The tradition is still " +
    "extending — and the events of the last twenty years have been a long, expensive " +
    "field test of who was right.",

    "Names and dates can wait for the bibliographies. Before any of that, the framework " +
    "has a *sound* — a cadence of argument, an instinct about where causation lives, a " +
    "scepticism about aggregates and committees. The interactive below is a calibration " +
    "exercise: a dozen real economist quotes, your job to spot which tradition each one " +
    "comes from before the attribution lands. Don't worry about getting them right. The " +
    "explanation panels are where the framework installs itself.",
  ],

  interactive: { kind: 'spot-the-school' },

  quotes: [
    {
      text:   "It is in fact the great achievement of Menger to have shown that the theory of value can be erected upon the basis of subjective valuations alone.",
      author: 'Friedrich Hayek',
      source: 'Carl Menger, introduction to Principles of Economics (1934)',
      year:   1934,
    },
    {
      text:   "Economics is not about things and tangible material objects; it is about men, their meanings and actions.",
      author: 'Ludwig von Mises',
      source: 'Human Action',
      year:   1949,
    },
    {
      text:   "The curious task of economics is to demonstrate to men how little they really know about what they imagine they can design.",
      author: 'Friedrich Hayek',
      source: 'The Fatal Conceit',
      year:   1988,
    },
  ],

  readingLadder: {
    beginner: [
      {
        title:       'Economics in One Lesson',
        author:      'Henry Hazlitt',
        year:        1946,
        description: 'The most accessible on-ramp. Learn to see the unseen consequences of policy.',
        freePdfLink: 'https://mises.org/library/book/economics-one-lesson',
      },
      {
        title:       'The Road to Serfdom',
        author:      'Friedrich Hayek',
        year:        1944,
        description: 'Wartime warning that economic planning is the road to political tyranny. Still the bestseller.',
        amazonLink:  'https://www.amazon.com/Road-Serfdom-Documents-Definitive-Collected/dp/0226320553',
      },
    ],
    intermediate: [
      {
        title:       'The Theory of Money and Credit',
        author:      'Ludwig von Mises',
        year:        1912,
        description: 'Mises extends marginal-utility theory to money itself. Foundations of ABCT.',
        freePdfLink: 'https://mises.org/library/book/theory-money-and-credit',
      },
      {
        title:       'Principles of Economics',
        author:      'Carl Menger',
        year:        1871,
        description: 'Where it all began. Surprisingly readable for a 19th-century treatise.',
        freePdfLink: 'https://mises.org/library/book/principles-economics',
      },
    ],
    deep: [
      {
        title:       'Human Action',
        author:      'Ludwig von Mises',
        year:        1949,
        description: 'The systematic treatise. ~900 pages. Read once a decade and find new things.',
        freePdfLink: 'https://mises.org/library/book/human-action-0',
      },
      {
        title:       'Man, Economy, and State',
        author:      'Murray Rothbard',
        year:        1962,
        description: 'Rothbard\'s reconstruction of the Misesian system, with politics attached.',
        freePdfLink: 'https://mises.org/library/book/man-economy-and-state-power-and-market',
      },
    ],
  },

  fieldTest: [
    {
      id:           'origin-q1',
      question:     'Who published Principles of Economics in 1871, founding what would become the Austrian school?',
      options:      ['Ludwig von Mises', 'Carl Menger', 'Friedrich Hayek', 'Eugen Böhm-Bawerk'],
      correctIndex: 1,
      explanation:
        'Carl Menger, then a journalist-turned-academic in Vienna, published Principles of Economics in 1871. ' +
        'Mises (1881–1973), Hayek (1899–1992) and Böhm-Bawerk (1851–1914) all came after. Böhm-Bawerk in fact ' +
        'taught Mises, who in turn taught Hayek — the lineage is direct.',
    },
    {
      id:           'origin-q2',
      question:     'According to the Austrian view, what is "the economy"?',
      options:      [
        'A self-regulating system best modelled with differential equations',
        'A national aggregate measurable through GDP, M2, and unemployment',
        'The unintended consequence of purposeful action by individual human beings',
        'A machine that requires central calibration to avoid recessions',
      ],
      correctIndex: 2,
      explanation:
        'Austrian economics is methodologically individualist. There is no "the economy" that acts — there are ' +
        'only people, acting. Aggregates are useful summaries but never causal entities. This is the foundation ' +
        'every later Austrian argument is built on.',
    },
    {
      id:           'origin-q3',
      question:     'Which event marks the end of the Bretton Woods gold-anchored monetary system?',
      options:      [
        'The founding of the Federal Reserve in 1913',
        'Roosevelt\'s 1933 gold confiscation',
        'The Nixon Shock of 1971',
        'The 2008 financial crisis',
      ],
      correctIndex: 2,
      explanation:
        'On 15 August 1971 Nixon "temporarily" suspended the dollar\'s convertibility to gold. The suspension ' +
        'was never reversed. From that moment the global monetary system has been pure fiat — a 50+ year ' +
        'experiment Austrians had warned would end badly. Look at the M2 hockey stick post-1971.',
    },
  ],

  tierGate: 'free',
};
