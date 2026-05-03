/**
 * Module 5 — The Knowledge Problem.
 *
 * Why no central planner can run an economy: the information needed
 * lives dispersed in millions of heads, and only prices can aggregate it.
 */

import type { VsModule } from '../types';

export const knowledgeProblemModule: VsModule = {
  slug:     'knowledge-problem',
  number:   5,
  title:    'The Knowledge Problem',
  subtitle: 'Why no committee can run an economy.',

  heroImage:    '/images/vienna-school/module-5-knowledge-problem-hero.png',
  heroImageAlt: 'A single yellow pencil on a vast white surface — Leonard Read\'s I, Pencil.',

  coldOpen:
    "Pick up a pencil. A simple object. Six inches of cedar wood, a graphite core, a brass " +
    "ferrule, a pink eraser. Now answer this: who knows how to make one? Not how to assemble " +
    "the parts — that's the easy bit. Who knows how to fell the cedar tree, mine the graphite, " +
    "smelt the brass, vulcanise the rubber, harvest the pumice that goes in the eraser, run " +
    "the railway that transports the components, write the insurance contracts that cover the " +
    "freight? Nobody. Not one human being on Earth knows how to make a pencil. And yet pencils " +
    "exist, by the billion, for pennies. How?",

  coreArgument: [
    "This is Leonard Read's *I, Pencil* (1958), and it's the most powerful illustration of " +
    "Friedrich Hayek's central insight: the knowledge required to coordinate a modern economy " +
    "is not held by anyone. It is dispersed across billions of human minds, each holding tiny " +
    "fragments — what's in the warehouse, what the customer wants, what the weather will do " +
    "tomorrow, what the local labour market looks like. No board, no ministry, no AI can " +
    "aggregate it, because most of it isn't even articulable. It's tacit. Local. Constantly " +
    "changing.",

    "The miracle of the price system, Hayek argued in *The Use of Knowledge in Society* (1945), " +
    "is that it doesn't *need* to aggregate that knowledge. Prices summarise it. When tin " +
    "becomes scarce somewhere in the world — for any reason; a mine collapse, a new use, a " +
    "trade route closure — the price of tin rises. Every tin user on Earth instantly receives " +
    "the signal: economise. Substitute. Reroute. They don't need to know *why*. They just need " +
    "the price. The system is a vast, distributed information processor, and prices are its " +
    "messages.",

    "Mises had made the harder version of this argument in 1922: under socialism, where the " +
    "means of production are owned in common, there are no prices for capital goods because " +
    "there are no markets for them. Without prices, there is no way to calculate whether one " +
    "use of resources is more valuable than another. The planner is **economically blind**. " +
    "He may have all the engineering data in the world, but he cannot perform the basic " +
    "calculation: is it better to make a thousand more tractors or a hundred more refrigerators? " +
    "There is no answer without prices, and there are no prices without markets.",

    "This is why every attempted socialist experiment of the 20th century descended into " +
    "shortages, surpluses, queues, and black markets. The black markets weren't a bug — they " +
    "were the system desperately reinventing the price mechanism it had abolished. The " +
    "interactive below makes the point in 30 seconds: try to set prices for five goods by " +
    "central command, then switch to a free market and watch equilibrium emerge.",
  ],

  interactive: { kind: 'central-planner-game' },

  quotes: [
    {
      text:   "The curious task of economics is to demonstrate to men how little they really know about what they imagine they can design.",
      author: 'Friedrich Hayek',
      source: 'The Fatal Conceit',
      year:   1988,
    },
    {
      text:   "The knowledge of the circumstances of which we must make use never exists in concentrated or integrated form, but solely as the dispersed bits of incomplete and frequently contradictory knowledge which all the separate individuals possess.",
      author: 'Friedrich Hayek',
      source: 'The Use of Knowledge in Society',
      year:   1945,
    },
    {
      text:   "Where there is no free market, there is no pricing mechanism; without a pricing mechanism, there is no economic calculation.",
      author: 'Ludwig von Mises',
      source: 'Economic Calculation in the Socialist Commonwealth',
      year:   1920,
    },
  ],

  readingLadder: {
    beginner: [
      {
        title:       'I, Pencil',
        author:      'Leonard E. Read',
        year:        1958,
        description: 'A six-page essay. The most powerful introduction to spontaneous order ever written.',
        freePdfLink: 'https://fee.org/resources/i-pencil/',
      },
      {
        title:       'The Road to Serfdom',
        author:      'Friedrich Hayek',
        year:        1944,
        description: 'Hayek\'s wartime warning that economic planning is the road to political tyranny.',
        amazonLink:  'https://www.amazon.com/Road-Serfdom-Documents-Definitive-Collected/dp/0226320553',
      },
    ],
    intermediate: [
      {
        title:       'The Use of Knowledge in Society',
        author:      'Friedrich Hayek',
        year:        1945,
        description: 'The 11-page essay that won him the Nobel. Read it twice.',
        freePdfLink: 'https://mises.org/library/use-knowledge-society',
      },
      {
        title:       'Economic Calculation in the Socialist Commonwealth',
        author:      'Ludwig von Mises',
        year:        1920,
        description: 'The original calculation argument. Marxists are still trying to refute it.',
        freePdfLink: 'https://mises.org/library/book/economic-calculation-socialist-commonwealth',
      },
    ],
    deep: [
      {
        title:       'Socialism: An Economic and Sociological Analysis',
        author:      'Ludwig von Mises',
        year:        1922,
        description: 'The full systematic treatment. Hayek said reading it changed his life.',
        freePdfLink: 'https://mises.org/library/book/socialism-economic-and-sociological-analysis',
      },
      {
        title:       'Individualism and Economic Order',
        author:      'Friedrich Hayek',
        year:        1948,
        description: 'Collected essays including "The Use of Knowledge" and "Economics and Knowledge."',
        freePdfLink: 'https://mises.org/library/book/individualism-and-economic-order',
      },
    ],
  },

  fieldTest: [
    {
      id:           'kp-q1',
      question:     'The "knowledge problem" of central planning, as Hayek formulated it, refers to:',
      options:      [
        'Planners not having advanced enough computers to model the economy',
        'The knowledge needed to coordinate an economy being dispersed, tacit, and constantly changing — and therefore unaggregable',
        'Citizens deliberately withholding information from the state',
        'Planners not having sufficient training in mathematics',
      ],
      correctIndex: 1,
      explanation:
        'Hayek\'s point is fundamental, not technical. The relevant economic knowledge — what people want, what ' +
        'inputs are available locally, what the weather is doing, what the customer changed her mind about ' +
        'yesterday — exists only as fragments in the heads of the people on the spot. Most of it is tacit ' +
        '(can\'t be put into words). All of it is constantly changing. No central body, however well-equipped, ' +
        'can hold it. Prices in a market system *summarise* this knowledge without ever needing to gather it.',
    },
    {
      id:           'kp-q2',
      question:     'In Mises\' 1920 calculation argument, what specifically prevents rational economic decision-making under socialism?',
      options:      [
        'The lack of incentives for workers',
        'The political corruption of central planners',
        'The absence of markets for capital goods, and therefore the absence of prices to calculate with',
        'The technological backwardness of socialist economies',
      ],
      correctIndex: 2,
      explanation:
        'Mises is making a stronger and more specific claim than the moral or political objections to socialism. ' +
        'Even granting honest, well-meaning planners with infinite computing power, you cannot decide whether ' +
        'tractors or refrigerators are a better use of steel without prices. And you cannot have prices without ' +
        'markets in the things being priced. Socialism abolishes the markets — and therefore abolishes the ' +
        'capacity for calculation. The planner is economically blind, no matter how clever.',
    },
    {
      id:           'kp-q3',
      question:     'Why did black markets persist throughout the 20th-century socialist experiments?',
      options:      [
        'Because citizens were inherently greedy and resisted the new order',
        'Because socialist governments were not strict enough in enforcing price controls',
        'Because the system was reinventing the price mechanism it had abolished — black markets were the economy\'s response to economic blindness',
        'Because foreign capitalist powers were funding underground trade',
      ],
      correctIndex: 2,
      explanation:
        'The persistence of black markets in every command economy is not a sign of human moral weakness or ' +
        'enforcement failure — it is the economy doing what economies must do. Without prices to coordinate ' +
        'production with consumption, shortages and surpluses are inevitable. The black market is the price ' +
        'mechanism reasserting itself, illegally, because the legal economy has lost the ability to function. ' +
        'It is the most direct evidence that prices are not optional decoration but load-bearing infrastructure.',
    },
  ],

  tierGate: 'free',
};
