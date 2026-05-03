/**
 * Module 6 — Why Now.
 *
 * The closing module: a 150-year analytical framework that has been quietly
 * predicting the future correctly while the mainstream got it wrong, finally
 * encounters its monetary asset. Bitcoin emerges as the framework's logical
 * conclusion — not because Austrians designed it, but because it satisfies
 * the criteria they had spent a century stating.
 */

import type { VsModule } from '../types';

export const whyNowModule: VsModule = {
  slug:     'why-now',
  number:   6,
  title:    'Why Now',
  subtitle: 'A 150-year framework finds its asset.',

  heroImage:    '/images/vienna-school/module-6-why-now-hero.png',
  heroImageAlt: 'A wall of pinned newspaper clippings, photos and index cards connected by red string — a forensic reconstruction.',

  coldOpen:
    "There is a particular flavour of intellectual vindication that comes from being told, for " +
    "fifty years, that you are wrong about everything that matters — and then being right. " +
    "The Austrian school of economics has lived in that flavour for the better part of a " +
    "century. The chart below gathers the receipts. On the left, the predictions of the " +
    "mainstream — Nobel laureates, Federal Reserve chairs, columnists at the *New York Times*. " +
    "On the right, the predictions of the Austrians, often dismissed as cranks at the time, " +
    "now reading like obituary notices. Scroll. The contrast accumulates.",

  coreArgument: [
    "The five preceding modules of this curriculum have walked through the analytical machinery " +
    "of the Vienna School: subjective marginal value (Module 2), the case for sound money " +
    "against fiat debasement (Module 3), time preference and the credit-induced business " +
    "cycle (Module 4), the impossibility of central planning under information dispersion " +
    "(Module 5). Each piece can be evaluated on its merits. Together they form a coherent, " +
    "predictive framework — one that has, for over a century, pointed at the same set of " +
    "structural failures and warned that they would arrive.",

    "They arrived. The 1970s stagflation that the Keynesian models had pronounced impossible. " +
    "The 2008 collapse of the credit-induced housing bubble. The 2020 monetary expansion that " +
    "ate decades of saver wealth in eighteen months. The post-2022 sovereign-bond crisis that " +
    "is still working its way through pension funds, regional banks, and commercial real " +
    "estate. Every one of these had Austrian forecasts, often decades in advance, often by " +
    "people the Establishment found embarrassing.",

    "Which leaves the obvious question: if the framework is so predictive, what does it say to " +
    "do about it? The classical Austrian answer was *return to gold* — a hard-money standard " +
    "the central bank cannot debase. That answer was politically dead by 1971. Gold is " +
    "physically heavy, custodially expensive, and trivially confiscatable by states (FDR did " +
    "exactly that in 1933). The framework had a prescription it had no asset to implement.",

    "**Bitcoin is the asset.** Not because Austrians designed it (they didn't — Satoshi was " +
    "obviously cypherpunk-adjacent, more cryptography than economics). Because it satisfies, " +
    "almost by accident, every criterion the framework had been listing for a century. Fixed " +
    "supply, mathematically enforced. Decentralised issuance, no central authority to debase. " +
    "Self-custody, no third party to confiscate. Borderless, no jurisdiction to capture. The " +
    "Vienna School had been describing Bitcoin's specification since Mises — without knowing " +
    "such a thing was technically possible. When it became technically possible, in 2009, the " +
    "framework had been waiting.",
  ],

  interactive: { kind: 'predictions-audit' },

  quotes: [
    {
      text:   "I think that the Internet is going to be one of the major forces for reducing the role of government. The one thing that's missing, but that will soon be developed, is a reliable e-cash.",
      author: 'Milton Friedman',
      source: 'NTU interview',
      year:   1999,
    },
    {
      text:   "It is essentially a fraud, and a wasteful one at that. There is no real value to it.",
      author: 'Paul Krugman, on Bitcoin',
      source: 'New York Times — \'Bitcoin is Evil\'',
      year:   2013,
    },
    {
      text:   "We do not have any plans to issue digital currency. There is, in our view, no need to.",
      author: 'Christine Lagarde, ECB',
      source: 'Press conference',
      year:   2018,
    },
  ],

  readingLadder: {
    beginner: [
      {
        title:       'The Bitcoin Standard',
        author:      'Saifedean Ammous',
        year:        2018,
        description: 'The clearest book that places Bitcoin within the Austrian monetary tradition.',
        amazonLink:  'https://www.amazon.com/Bitcoin-Standard-Decentralized-Alternative-Central/dp/1119473861',
      },
      {
        title:       'The Sovereign Individual',
        author:      'James Dale Davidson & Lord William Rees-Mogg',
        year:        1997,
        description: 'A pre-Bitcoin prediction of digital sovereignty that reads like a 2025 newspaper.',
        amazonLink:  'https://www.amazon.com/Sovereign-Individual-Mastering-Transition-Information/dp/0684832720',
      },
    ],
    intermediate: [
      {
        title:       'The Fiat Standard',
        author:      'Saifedean Ammous',
        year:        2021,
        description: 'The companion volume — the full Austrian autopsy of post-1971 fiat.',
        amazonLink:  'https://www.amazon.com/Fiat-Standard-Saifedean-Ammous/dp/1544526474',
      },
      {
        title:       'Layered Money',
        author:      'Nik Bhatia',
        year:        2021,
        description: 'A clean technical exposition of monetary layers, gold to Bitcoin.',
        amazonLink:  'https://www.amazon.com/Layered-Money-Gold-Dollars-Bitcoin/dp/1736110527',
      },
    ],
    deep: [
      {
        title:       'The Ethics of Money Production',
        author:      'Jörg Guido Hülsmann',
        year:        2008,
        description: 'A modern Misesian re-statement of the moral case for sound money.',
        freePdfLink: 'https://mises.org/library/book/ethics-money-production',
      },
      {
        title:       'Democracy: The God That Failed',
        author:      'Hans-Hermann Hoppe',
        year:        2001,
        description: 'Hoppe\'s political-philosophical companion to the monetary critique.',
        amazonLink:  'https://www.amazon.com/Democracy-God-That-Failed-Civilization/dp/0765808684',
      },
    ],
  },

  fieldTest: [
    {
      id:           'wn-q1',
      question:     'Which of these is NOT one of the Vienna School\'s structural critiques borne out by post-1971 events?',
      options:      [
        'Sustained credit expansion produces malinvestment that must eventually liquidate',
        'Without market prices, central planning is economically blind',
        'Fiat currency tends to lose purchasing power over long time horizons',
        'Free trade between nations causes mass unemployment in importing countries',
      ],
      correctIndex: 3,
      explanation:
        'The first three are core Austrian arguments, all amply confirmed by 50+ years of post-1971 monetary ' +
        'history. The fourth is a *protectionist* claim that Austrians have specifically rejected since Mises ' +
        '(see Human Action chapters on international trade). Don\'t confuse the Vienna School with the ' +
        'mercantilist tradition — they are opposed.',
    },
    {
      id:           'wn-q2',
      question:     'Why do Austrians argue Bitcoin satisfies their century-old monetary specification?',
      options:      [
        'Because Satoshi Nakamoto was an Austrian economist',
        'Because central banks have endorsed it as a reserve asset',
        'Because it is fixed-supply, decentrally issued, self-custodial, and borderless — the criteria the framework had been describing without knowing such a thing was technically possible',
        'Because it is regulated by a competent international body that ensures stability',
      ],
      correctIndex: 2,
      explanation:
        'The argument is *not* that Austrians designed Bitcoin (they didn\'t — Satoshi\'s influences were ' +
        'cryptographic and cypherpunk). The argument is that Bitcoin satisfies, by accident or by ' +
        'convergent design, the criteria the framework had been articulating for a century: scarcity that ' +
        'cannot be debased, issuance no authority controls, custody the holder retains, and movement no ' +
        'border can stop. The framework had a prescription. The technology made the prescription possible.',
    },
    {
      id:           'wn-q3',
      question:     'What is the most honest summary of the Austrian framework\'s recent track record?',
      options:      [
        'It has been wrong about most things and is now being abandoned even by its proponents',
        'It has been right about the structural fragilities (inflation, malinvestment, planning failure) while being wrong about the *timing* of specific events',
        'It correctly predicted every recession on the exact date',
        'It is mostly a moral and political philosophy with no empirical content',
      ],
      correctIndex: 1,
      explanation:
        'The framework is structural, not predictive of timing. It tells you fiat currencies will lose ' +
        'purchasing power — not on which Tuesday. It tells you credit-induced booms must end in busts — not ' +
        'in which quarter. The framework\'s critics have often pointed at "the boy who cried wolf" — and the ' +
        'framework\'s answer is that the wolf eventually showed up, every time. Don\'t over-claim. Don\'t ' +
        'under-claim either.',
    },
  ],

  tierGate: 'free',
};
