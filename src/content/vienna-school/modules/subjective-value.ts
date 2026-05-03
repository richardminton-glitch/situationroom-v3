/**
 * Module 2 — Subjective Value.
 *
 * The marginalist revolution. Why a glass of water is worth more than a
 * diamond — until it isn't. Free tier.
 */

import type { VsModule } from '../types';

export const subjectiveValueModule: VsModule = {
  slug:     'subjective-value',
  number:   2,
  title:    'Subjective Value',
  subtitle: 'A glass of water is worth more than a diamond. Until it isn\'t.',

  heroImage:    '/images/vienna-school/module-2-subjective-value-hero.png',
  heroImageAlt: 'A single glass of clear water on a kitchen counter, ordinary and unnoticed.',

  coldOpen:
    "Classical economics had a problem it couldn't solve. Water is essential to life and " +
    "diamonds are useless ornaments — yet diamonds command a price thousands of times higher " +
    "than water. Adam Smith noticed this in 1776 and shrugged. Marx tried to fix it with a " +
    "labour theory of value: things are worth what it costs in human effort to produce them. " +
    "It was an elegant story. It was also wrong. The fix came from Vienna in 1871, and it " +
    "rebuilt economics from the ground up.",

  coreArgument: [
    "Carl Menger's insight was deceptively simple. Value is not a property of things. " +
    "Value is a relationship between a person and a thing, in a particular situation, at " +
    "a particular time. A glass of water in your kitchen — where the tap is six inches " +
    "away — is worth almost nothing. The same glass of water, offered to a man dying of " +
    "thirst in a desert, is worth everything he owns.",

    "The thing didn't change. The person didn't change. The *situation* changed. The " +
    "marginal use to which that next glass would be put — the most-pressing unmet need — " +
    "is what determines its value. Economists call this **marginal utility**. The first " +
    "glass slakes thirst. The second cooks dinner. The third washes the car. The fourth " +
    "waters the lawn. Each successive glass is allocated to a less-urgent use, so each " +
    "is worth less to its owner than the one before.",

    "This destroyed three centuries of confused economic thinking in a stroke. Prices " +
    "are not set by costs of production, or by some intrinsic worth, or by a Marxist " +
    "ledger of labour hours. Prices emerge from the subjective marginal valuations of " +
    "buyers and sellers meeting in a market. The diamond/water paradox isn't a paradox " +
    "at all — it's just that diamonds are scarce relative to the demand for ornament, " +
    "and water (in most places, most of the time) is abundant relative to demand for " +
    "drinking. Move someone to the desert, the prices invert.",

    "Use the interactive below. Allocate five glasses of water to five competing uses, " +
    "watch utility decline at the margin, then remove the most-valued use and see how " +
    "the entire valuation structure reshuffles. This is the foundation of every Austrian " +
    "argument that follows: subjective, marginal, situational. There is no \"true price\" " +
    "of anything — only the prices that emerge when people, with their preferences and " +
    "their circumstances, freely trade.",
  ],

  interactive: { kind: 'marginal-utility-glasses' },

  quotes: [
    {
      text:   "Value is therefore nothing inherent in goods, no property of them, nor an independent thing existing by itself. It is a judgement economising men make about the importance of the goods at their disposal for the maintenance of their lives and well-being.",
      author: 'Carl Menger',
      source: 'Principles of Economics',
      year:   1871,
    },
    {
      text:   "There are, in the field of economics, no constant relations, and consequently no measurement is possible.",
      author: 'Ludwig von Mises',
      source: 'Human Action',
      year:   1949,
    },
    {
      text:   "The value of a thing is the amount of advantage we expect to derive from it; and from this point of view there is nothing absurd in the proposition that water has more value than diamonds.",
      author: 'Eugen von Böhm-Bawerk',
      source: 'Capital and Interest',
      year:   1884,
    },
  ],

  readingLadder: {
    beginner: [
      {
        title:       'Choice: Cooperation, Enterprise, and Human Action',
        author:      'Robert P. Murphy',
        year:        2015,
        description: 'A modern, accessible introduction to Misesian price theory and marginal analysis.',
        amazonLink:  'https://www.amazon.com/Choice-Cooperation-Enterprise-Human-Action/dp/1598131214',
      },
      {
        title:       'Lessons for the Young Economist',
        author:      'Robert P. Murphy',
        year:        2010,
        description: 'High-school-level Austrian economics, written to make subjective value click.',
        freePdfLink: 'https://mises.org/library/book/lessons-young-economist',
      },
    ],
    intermediate: [
      {
        title:       'Principles of Economics',
        author:      'Carl Menger',
        year:        1871,
        description: 'Read chapters 3 and 4 — the original case for subjective and marginal value.',
        freePdfLink: 'https://mises.org/library/book/principles-economics',
      },
      {
        title:       'The Theory of Money and Credit',
        author:      'Ludwig von Mises',
        year:        1912,
        description: 'Mises extends Menger\'s subjective theory to money itself. Foundational.',
        freePdfLink: 'https://mises.org/library/book/theory-money-and-credit',
      },
    ],
    deep: [
      {
        title:       'Capital and Interest',
        author:      'Eugen von Böhm-Bawerk',
        year:        1884,
        description: 'The full demolition of the labour theory of value. Three volumes, dense.',
        freePdfLink: 'https://mises.org/library/book/capital-and-interest',
      },
      {
        title:       'Value, Capital, and Rent',
        author:      'Knut Wicksell',
        year:        1893,
        description: 'A Swede synthesises Menger and Walras. The bridge between the schools.',
        freePdfLink: 'https://mises.org/library/book/value-capital-and-rent',
      },
    ],
  },

  fieldTest: [
    {
      id:           'sv-q1',
      question:     'According to the Austrian theory of value, the price of a good is determined by:',
      options:      [
        'The number of labour hours required to produce it',
        'Its intrinsic usefulness to humanity',
        'The subjective marginal valuations of buyers and sellers',
        'Government regulation of supply and demand',
      ],
      correctIndex: 2,
      explanation:
        'Menger broke with the classical (and later Marxist) view that value comes from labour or intrinsic ' +
        'properties. Value is subjective — it lives in the minds of acting people — and it is determined at ' +
        'the *margin*: by the next-most-pressing use the next unit would be put to. Everything else in Austrian ' +
        'price theory follows from this.',
    },
    {
      id:           'sv-q2',
      question:     'The diamond-water paradox is resolved by the recognition that:',
      options:      [
        'Diamonds are intrinsically more valuable than water',
        'Marginal utility — not total utility — drives price, and water is usually abundant at the margin',
        'Diamonds require more labour to extract than water',
        'Water is undervalued by the market and should be priced higher',
      ],
      correctIndex: 1,
      explanation:
        'Total utility of water is enormous (we need it to live). But the *marginal* utility of the next glass — ' +
        'when the tap is right there — is tiny. Diamonds are scarce relative to demand for ornament, so each ' +
        'marginal diamond commands a high price. Move the same person to the desert and the relationship inverts ' +
        'instantly. Marginal, not total, drives price.',
    },
    {
      id:           'sv-q3',
      question:     'If you remove a higher-priority use for a good (e.g. drinking water becomes unavailable), what happens to the valuation of remaining units allocated to lower-priority uses?',
      options:      [
        'They fall — the good has lost its highest use',
        'They stay the same — each unit is independently valued',
        'They rise — the remaining units are reallocated to higher-priority uses',
        'They become unmeasurable — only the lost use can be priced',
      ],
      correctIndex: 2,
      explanation:
        'This is the heart of marginal analysis. Units are not glued to specific uses. When the most-valued use ' +
        'disappears, the units previously allocated to it get redistributed — the unit that was watering the lawn ' +
        'now waters plants; the one washing the car now cooks dinner. The margin shifts up, and every remaining ' +
        'unit takes on the higher value of its new use. This is also why monetary inflation hurts savers: when ' +
        'the supply of money is expanded, every existing unit\'s marginal value falls.',
    },
  ],

  tierGate: 'free',
};
