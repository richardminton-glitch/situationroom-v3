/**
 * Module 3 — Sound Money.
 *
 * Gold, the printing press, and the long con. The marquee module —
 * houses the gold-vs-M2 chart that's designed to be screenshotted
 * and shared with the situationroom.space watermark intact.
 */

import type { VsModule } from '../types';

export const soundMoneyModule: VsModule = {
  slug:     'sound-money',
  number:   3,
  title:    'Sound Money',
  subtitle: 'Gold, the printing press, and the long con.',

  heroImage:    '/images/vienna-school/module-3-sound-money-hero.png',
  heroImageAlt: 'A heavy industrial printing press in operation, sheets of paper feeding through.',

  coldOpen:
    "In 1913, you could walk into any branch of any bank in the United States and exchange a " +
    "twenty-dollar bill for a one-ounce gold coin. The bill was a claim cheque. The gold was " +
    "the money. By 1933, that exchange was a federal crime. By 1971, the bill no longer " +
    "promised anything at all — it was just a piece of paper that the government insisted you " +
    "accept as money, and that the government's central bank could print in any quantity it " +
    "chose. The half-century that followed has been the largest monetary experiment in human " +
    "history. The chart below is its receipt.",

  coreArgument: [
    "Sound money is money the issuing authority cannot easily debase. For most of human " +
    "civilisation, that meant gold and silver — durable, divisible, fungible, and above all, " +
    "**hard to produce more of**. Gold's above-ground stock grows by roughly 1.5% per year " +
    "as new mining adds to the cumulative total. That's not zero — but it's slow, predictable, " +
    "and capped by the laws of geology. Anyone trying to inflate the gold supply by even 10% " +
    "in a year would have to dig up more in twelve months than humans have managed in any " +
    "five-year period since the California Gold Rush.",

    "Fiat currency has no such constraint. The United States M2 broad money stock — currency " +
    "plus deposits, the working measure of dollars in circulation — was about $626 billion in " +
    "1970. By 2025 it stands above $22 trillion. That is a 35× expansion in 55 years. Gold's " +
    "stock over the same period grew by less than 3×. The chart below puts both lines on the " +
    "same canvas. The gold curve is a gentle slope. The M2 curve is a hockey stick that goes " +
    "vertical after 2020. There is no economic theory needed to read it. Look.",

    "This is what Austrians have warned about since Mises wrote *The Theory of Money and " +
    "Credit* in 1912. When the issuer can create money at will, the holders of money are " +
    "silently taxed by the loss of purchasing power. The chart's purple line is the same " +
    "story told from the saver's perspective: $1 of 1913 dollars buys roughly **three cents** " +
    "of 2025 goods. A century-long, gradient-of-painlessness expropriation. The grandparent " +
    "who saved diligently in cash gave the bulk of that wealth to the bondholders, the " +
    "asset-owners, and ultimately to the government that issued the dollar. Nobody robbed " +
    "the savers. They were just left behind.",

    "Bitcoin, plotted alongside, is the digital answer to a 5,000-year-old monetary question: " +
    "can we have a money the issuing authority cannot debase, but without the storage, " +
    "transport, and verification costs that made gold practical only at the institutional " +
    "level? The asymptotic curve to 21 million coins is enforced by software that runs on " +
    "tens of thousands of independent nodes. The halvings — visible as gentle inflection " +
    "points every four years — are scheduled until ~2140. By 2025 over 95% of all bitcoin " +
    "that will ever exist has already been mined. This is not an investment thesis. It is a " +
    "monetary engineering specification. Module 6 returns to it.",
  ],

  interactive:          { kind: 'gold-vs-m2-chart' },
  secondaryInteractive: { kind: 'currency-cemetery' },

  quotes: [
    {
      text:   "In the absence of the gold standard, there is no way to protect savings from confiscation through inflation. There is no safe store of value.",
      author: 'Alan Greenspan',
      source: 'Gold and Economic Freedom',
      year:   1966,
    },
    {
      text:   "The gold standard did not collapse. Governments abolished it in order to pave the way for inflation. The whole grim apparatus of oppression and coercion — policemen, soldiers, prisons, executions — are necessary to elect the inflationist.",
      author: 'Ludwig von Mises',
      source: 'Human Action',
      year:   1949,
    },
    {
      text:   "The history of fiat money is, to put it kindly, one of failure. Every fiat currency since the Romans first began the practice in the first century has ended in devaluation and eventual collapse, of not only the currency, but of the economy that housed the fiat currency as well.",
      author: 'Greg Hunter',
      source: 'USA Watchdog',
    },
  ],

  readingLadder: {
    beginner: [
      {
        title:       'The Bitcoin Standard',
        author:      'Saifedean Ammous',
        year:        2018,
        description: 'The clearest modern case for sound money, written for the Bitcoin generation.',
        amazonLink:  'https://www.amazon.com/Bitcoin-Standard-Decentralized-Alternative-Central/dp/1119473861',
      },
      {
        title:       'What Has Government Done to Our Money?',
        author:      'Murray Rothbard',
        year:        1963,
        description: 'A 60-page demolition of fiat currency. Read in one sitting.',
        freePdfLink: 'https://mises.org/library/book/what-has-government-done-our-money',
      },
    ],
    intermediate: [
      {
        title:       'The Theory of Money and Credit',
        author:      'Ludwig von Mises',
        year:        1912,
        description: 'The original Austrian treatment of money. Foundations of business cycle theory.',
        freePdfLink: 'https://mises.org/library/book/theory-money-and-credit',
      },
      {
        title:       'The Ethics of Money Production',
        author:      'Jörg Guido Hülsmann',
        year:        2008,
        description: 'A modern Misesian re-statement with a sharper moral edge.',
        freePdfLink: 'https://mises.org/library/book/ethics-money-production',
      },
    ],
    deep: [
      {
        title:       'A History of Money and Banking in the United States',
        author:      'Murray Rothbard',
        year:        2002,
        description: 'The full Austrian re-telling of US monetary history. 500+ pages.',
        freePdfLink: 'https://mises.org/library/book/history-money-and-banking-united-states-colonial-era-world-war-ii',
      },
      {
        title:       'The Mystery of Banking',
        author:      'Murray Rothbard',
        year:        1983,
        description: 'How fractional reserve banking actually works. Demystifies the system.',
        freePdfLink: 'https://mises.org/library/book/mystery-banking',
      },
    ],
  },

  fieldTest: [
    {
      id:           'sm-q1',
      question:     'Roughly how much has the US M2 money stock expanded since 1970?',
      options:      [
        'About 3 times',
        'About 10 times',
        'About 35 times',
        'About 200 times',
      ],
      correctIndex: 2,
      explanation:
        'M2 was about $626bn in 1970 and stands above $22 trillion by 2025 — a 35× expansion in 55 years. ' +
        'Gold\'s above-ground stock over the same period grew less than 3×. That ratio — 35× vs 3× — is ' +
        'why the dollar lost purchasing power and gold (very roughly) preserved it. There is no monetary ' +
        'mystery here, only arithmetic.',
    },
    {
      id:           'sm-q2',
      question:     'What event in 1971 fundamentally changed the nature of the US dollar?',
      options:      [
        'The introduction of credit cards on a mass scale',
        'Nixon\'s closing of the gold window — the dollar ceased to be redeemable in gold',
        'The introduction of the IMF Special Drawing Rights system',
        'The adoption of computerised banking',
      ],
      correctIndex: 1,
      explanation:
        'On 15 August 1971 Nixon "temporarily" suspended the dollar\'s convertibility into gold. The ' +
        '"temporary" measure was never reversed. From that moment, the dollar — and by extension every ' +
        'currency pegged to it under Bretton Woods — became pure fiat. The chart\'s post-1971 hockey stick ' +
        'is the visible signature of that change. Everything Austrians warned about followed.',
    },
    {
      id:           'sm-q3',
      question:     'According to the Austrian view, what is the primary harm caused by sustained monetary inflation?',
      options:      [
        'It causes consumer prices to rise, which is annoying',
        'It silently transfers wealth from holders of money (savers) to those nearest the money creation (asset owners, bondholders, the state) — the Cantillon effect',
        'It reduces government tax revenues',
        'It makes international trade more difficult',
      ],
      correctIndex: 1,
      explanation:
        'Consumer-price rises are the symptom, not the disease. The deeper harm is distributional. New ' +
        'money does not enter the economy uniformly — it enters at specific points (banks, government ' +
        'spending, asset markets) and works its way outward. People who receive the new money first buy ' +
        'goods at old prices; people who receive it last (savers, wage-earners) face the higher prices. ' +
        'This is the Cantillon effect. Inflation is a stealth tax that takes from the patient and gives ' +
        'to the leveraged.',
    },
  ],

  tierGate: 'free',
};
