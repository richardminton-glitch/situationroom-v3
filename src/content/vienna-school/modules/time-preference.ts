/**
 * Module 4 — Time Preference.
 *
 * Capital, interest, and the Hayekian triangle. The conceptually most
 * demanding module — interest rate is not a "policy lever" but a price
 * that coordinates production across time. Mess with it and the whole
 * structure of capital distorts.
 */

import type { VsModule } from '../types';

export const timePreferenceModule: VsModule = {
  slug:     'time-preference',
  number:   4,
  title:    'Time Preference',
  subtitle: 'Capital, interest, and the structure of production.',

  heroImage:    '/images/vienna-school/module-4-time-preference-hero.png',
  heroImageAlt: 'A cross-section diagram of an industrial production pipeline — raw materials in, consumer goods out.',

  coldOpen:
    "Imagine you are deciding whether to spend £100 today on a meal out, or save it for a " +
    "year. If a friend offered to borrow that £100 for twelve months, what would you charge " +
    "them in interest? £5? £50? You'd quote a number that reflected, among other things, your " +
    "personal preference for *now* over *later*. Austrians call this **time preference**, and " +
    "they put it at the centre of the entire theory of capital and interest. Interest is not " +
    "the price the central bank announces. It is the price of time itself.",

  coreArgument: [
    "Production takes time. A loaf of bread that hits a supermarket shelf on Tuesday started " +
    "as wheat sown nine months earlier, which depended on a tractor manufactured five years " +
    "before that, which depended on steel smelted in a furnace built two decades ago, which " +
    "depended on iron ore mined by equipment whose design dates back half a century. Every " +
    "modern good emerges from a long, time-spanning **structure of production**: raw materials " +
    "at one end, finished consumer goods at the other, and dozens of intermediate stages in " +
    "between, each one tying up capital for some span of time before the consumer good emerges.",

    "How long is that structure? How many stages of production are profitable? That depends on " +
    "the **interest rate** — but only on the *natural* interest rate, the one that emerges " +
    "from people's actual time preferences as expressed in voluntary saving and borrowing. " +
    "When real saving is high, the natural rate is low, and entrepreneurs find it profitable " +
    "to undertake long, capital-intensive projects (because the cost of waiting is low). When " +
    "real saving is scarce, the natural rate is high, and the structure of production is short " +
    "and consumer-near. The interest rate, in other words, *coordinates* production with " +
    "people's actual willingness to defer consumption.",

    "Central banks do not understand this. They treat the interest rate as a thermostat for " +
    "the macroeconomy — too cold? lower it. When they push it below the natural rate by " +
    "creating new credit (rather than relying on real saving), they send a false signal to " +
    "every entrepreneur in the economy: *people have started saving more, your long-dated " +
    "projects are now profitable*. Long-dated projects get launched. Capital flows to early " +
    "stages of production. The structure stretches out — but the underlying real saving " +
    "hasn't actually increased. The new credit was conjured. **Malinvestment accumulates**. " +
    "This is the Austrian Business Cycle.",

    "Every recession Austrians have ever predicted in advance has had this shape: a credit-" +
    "induced boom that distorts the capital structure, followed by a bust as the unsustainable " +
    "long-dated projects reveal themselves as the malinvestments they always were. 2008 was " +
    "this. 2001 was this. The 1929 collapse was this. The interactive below lets you play " +
    "central bank: suppress the rate, watch malinvestment accumulate as the triangle distorts, " +
    "then hit the crash button. The collapse is not a bug of the system. It is the system " +
    "reasserting reality.",
  ],

  interactive: { kind: 'hayekian-triangle' },

  quotes: [
    {
      text:   "Time preference is the relative valuation of present versus future goods. It is the very essence of human action.",
      author: 'Murray Rothbard',
      source: 'Man, Economy, and State',
      year:   1962,
    },
    {
      text:   "If credit expansion is not stopped in time, the boom turns into the crack-up boom; the flight into real values begins, and the whole monetary system founders.",
      author: 'Ludwig von Mises',
      source: 'Human Action',
      year:   1949,
    },
    {
      text:   "The boom can last only as long as the credit expansion progresses at an ever-accelerated pace. The boom comes to an end as soon as additional quantities of fiduciary media are no longer thrown upon the loan market.",
      author: 'Ludwig von Mises',
      source: 'Human Action',
      year:   1949,
    },
  ],

  readingLadder: {
    beginner: [
      {
        title:       'America\'s Great Depression',
        author:      'Murray Rothbard',
        year:        1963,
        description: 'The Austrian theory of the business cycle, applied to the 1929 crash. Devastating.',
        freePdfLink: 'https://mises.org/library/book/americas-great-depression',
      },
      {
        title:       'Meltdown',
        author:      'Thomas E. Woods Jr.',
        year:        2009,
        description: 'A short, accessible Austrian autopsy of the 2008 Global Financial Crisis.',
        amazonLink:  'https://www.amazon.com/Meltdown-Free-Market-Collapsed-Government-Bailouts/dp/1596985879',
      },
    ],
    intermediate: [
      {
        title:       'Prices and Production',
        author:      'Friedrich Hayek',
        year:        1931,
        description: 'The original presentation of the Hayekian triangle. Read with diagrams to hand.',
        freePdfLink: 'https://mises.org/library/book/prices-and-production',
      },
      {
        title:       'The Theory of Money and Credit',
        author:      'Ludwig von Mises',
        year:        1912,
        description: 'Re-read the chapters on credit expansion and the cycle. Foundational.',
        freePdfLink: 'https://mises.org/library/book/theory-money-and-credit',
      },
    ],
    deep: [
      {
        title:       'Capital and Interest',
        author:      'Eugen von Böhm-Bawerk',
        year:        1884,
        description: 'The original treatise on capital structure and time preference. Three volumes.',
        freePdfLink: 'https://mises.org/library/book/capital-and-interest',
      },
      {
        title:       'Time and Money',
        author:      'Roger W. Garrison',
        year:        2001,
        description: 'The modern synthesis of the Hayekian triangle with macroeconomic graphics. The standard reference.',
        amazonLink:  'https://www.amazon.com/Time-Money-Macroeconomics-Capital-Structure/dp/0415771226',
      },
    ],
  },

  fieldTest: [
    {
      id:           'tp-q1',
      question:     'In the Austrian framework, what is the "natural rate of interest"?',
      options:      [
        'The rate the central bank publishes as its target',
        'The rate that emerges from people\'s actual time preferences as expressed in voluntary saving and borrowing',
        'The rate equal to the rate of inflation plus a small premium',
        'The rate that maintains 2% CPI growth',
      ],
      correctIndex: 1,
      explanation:
        'The natural rate is a market-clearing price for present-vs-future goods. It reflects the actual ' +
        'aggregate willingness of savers to defer consumption — i.e., the actual pool of real loanable funds. ' +
        'When the central bank pushes the headline rate below this level via credit expansion (without any ' +
        'change in real saving), entrepreneurs receive a false signal that long-dated projects are ' +
        'profitable when in fact the underlying capital is not there to sustain them.',
    },
    {
      id:           'tp-q2',
      question:     'According to Austrian Business Cycle Theory, what specifically happens when the central bank suppresses the interest rate below the natural rate?',
      options:      [
        'Inflation rises immediately and uniformly across all goods',
        'GDP grows in a healthy and sustainable way',
        'Capital flows to long-dated stages of production that aren\'t actually supported by real saving — malinvestment accumulates',
        'The currency strengthens against trading partners',
      ],
      correctIndex: 2,
      explanation:
        'The artificially-suppressed rate makes long-term, capital-intensive projects look profitable. ' +
        'Entrepreneurs launch them. The structure of production stretches out. But the real saving needed ' +
        'to sustain those projects to completion does not exist. The boom proceeds on borrowed time. When ' +
        'the credit expansion stops or slows, the malinvested capital is exposed as such — and the bust ' +
        'forcibly liquidates it. The crash *is* the recovery. The crash is the system recovering reality.',
    },
    {
      id:           'tp-q3',
      question:     'Which of these is NOT a recession that Austrians typically explain via Austrian Business Cycle Theory?',
      options:      [
        'The 2008 Global Financial Crisis',
        'The 2001 dot-com crash',
        'The 1929 stock market crash and subsequent depression',
        'A war-induced collapse caused by physical destruction of capital',
      ],
      correctIndex: 3,
      explanation:
        'ABCT explains *credit-induced* boom-bust cycles — recessions caused by the central bank\'s artificial ' +
        'suppression of interest rates leading to malinvestment that must eventually be liquidated. War, ' +
        'natural disasters, plagues, and similar shocks destroy real capital directly and cause downturns ' +
        'through entirely different channels. ABCT is a theory of how credit expansion creates fragility, ' +
        'not a theory of all recessions.',
    },
  ],

  tierGate: 'free',
};
