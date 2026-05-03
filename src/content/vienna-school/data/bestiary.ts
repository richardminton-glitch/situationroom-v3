/**
 * The Bestiary — glossary of Austrian terms.
 *
 * Each entry: term, slug, one-line definition, longer example, optional
 * attributed quote, related-term slugs, and the modules it belongs to.
 *
 * Initial roster covers the spec's required entries; future sessions can
 * extend without schema changes.
 */

import type { VsQuote } from '../types';

export interface BestiaryEntry {
  term:         string;
  slug:         string;
  definition:   string;          // 1 line
  example:      string;          // 2-3 sentences
  relatedTerms: string[];        // slugs of other bestiary entries
  modules:      string[];        // slugs of modules where it surfaces
  quote?:       VsQuote;
}

export const BESTIARY: BestiaryEntry[] = [
  {
    term: 'Austrian Business Cycle Theory',
    slug: 'abct',
    definition: 'The theory that credit-induced suppression of interest rates produces unsustainable booms that must liquidate.',
    example:
      'Mises and Hayek\'s account of how central-bank rate suppression mis-signals to entrepreneurs ' +
      'that long-dated projects are profitable. Capital rushes into early stages of production, the ' +
      'boom ascends — until the lack of underlying real saving forces a bust. ABCT explains 1929, 1973, ' +
      '2001, 2008, and is the framework Austrians use to interpret the present moment.',
    relatedTerms: ['malinvestment', 'time-preference', 'cantillon-effect'],
    modules:      ['time-preference'],
    quote: {
      text:   'There is no means of avoiding the final collapse of a boom brought about by credit expansion.',
      author: 'Ludwig von Mises',
      source: 'Human Action',
      year:   1949,
    },
  },
  {
    term: 'Cantillon effect',
    slug: 'cantillon-effect',
    definition: 'New money does not enter the economy uniformly — those who receive it first benefit at the expense of those who receive it last.',
    example:
      'Named after Richard Cantillon (c. 1730). When central banks expand the money supply, the new ' +
      'units enter at specific points (banks, government spending, asset markets). Recipients near the ' +
      'spigot buy goods at old prices; people downstream face the higher prices the expansion eventually ' +
      'produces. Inflation is not a uniform tax — it is a stealth transfer from savers and wage-earners ' +
      'to leveraged asset holders and the state.',
    relatedTerms: ['sound-money', 'malinvestment'],
    modules:      ['sound-money'],
  },
  {
    term: 'Catallactics',
    slug: 'catallactics',
    definition: 'The branch of economics that studies the laws of exchange — how prices emerge from acting individuals trading.',
    example:
      'Mises\' preferred name for the bulk of orthodox economic theory: the science of exchange ratios. ' +
      'Distinct from praxeology (the broader logic of human action) of which it is a subset. Where ' +
      'mainstream economics talks about "the market" as if it were a thing, catallactics talks about ' +
      'people exchanging — and the prices that emerge as the trace of those exchanges.',
    relatedTerms: ['praxeology', 'subjective-value'],
    modules:      ['origin', 'subjective-value'],
  },
  {
    term: 'Knowledge problem',
    slug: 'knowledge-problem',
    definition: 'The information needed to coordinate an economy is dispersed, tacit, and constantly changing — therefore unaggregable by any central body.',
    example:
      'Hayek\'s 1945 insight (The Use of Knowledge in Society). Most economically relevant knowledge ' +
      'lives only as fragments in the heads of millions of individuals: what\'s in this warehouse today, ' +
      'what the customer changed her mind about yesterday, what the local labour market is doing. Prices ' +
      'summarise this knowledge without any central body needing to gather it. Take prices away (via ' +
      'central planning) and the planner is economically blind.',
    relatedTerms: ['spontaneous-order', 'methodological-individualism'],
    modules:      ['knowledge-problem'],
    quote: {
      text:   'The knowledge of the circumstances of which we must make use never exists in concentrated or integrated form, but solely as the dispersed bits of incomplete and frequently contradictory knowledge which all the separate individuals possess.',
      author: 'Friedrich Hayek',
      source: 'The Use of Knowledge in Society',
      year:   1945,
    },
  },
  {
    term: 'Malinvestment',
    slug: 'malinvestment',
    definition: 'Investment in long-dated capital projects that the underlying pool of real saving cannot sustain — the result of credit expansion.',
    example:
      'When the central bank pushes the rate below natural via credit expansion, entrepreneurs receive ' +
      'a false signal that long-dated projects are profitable. They launch them. The structure of ' +
      'production stretches out. But the saving needed to complete those projects doesn\'t exist — it ' +
      'was conjured. The accumulated mismatch is malinvestment, and the bust is the moment reality ' +
      'reasserts itself.',
    relatedTerms: ['abct', 'time-preference'],
    modules:      ['time-preference'],
  },
  {
    term: 'Marginal utility',
    slug: 'marginal-utility',
    definition: 'The added satisfaction a consumer gets from one more unit of a good — and the basis of subjective valuation.',
    example:
      'Carl Menger\'s 1871 breakthrough. Value is not in the thing — it is in the relationship between ' +
      'a person and the *next* unit of that thing in their particular situation. The first glass of ' +
      'water in a desert is worth your wallet; the fifth is worth almost nothing. This is why diamonds ' +
      'cost more than water in normal life despite water being the more vital substance.',
    relatedTerms: ['subjective-value', 'catallactics'],
    modules:      ['subjective-value'],
  },
  {
    term: 'Methodological individualism',
    slug: 'methodological-individualism',
    definition: 'The principle that economic phenomena are explainable only as the unintended consequences of choices made by individual human beings.',
    example:
      'There is no "the economy" that acts. There are only people, acting. Aggregates like GDP, M2, or ' +
      'unemployment are summaries — useful sometimes, dangerous when treated as causal entities. The ' +
      'Austrian school is rigorously methodological-individualist: every claim about the macro must ' +
      'reduce, in principle, to a story about individual humans making choices.',
    relatedTerms: ['praxeology', 'knowledge-problem'],
    modules:      ['origin'],
  },
  {
    term: 'Praxeology',
    slug: 'praxeology',
    definition: 'The science of human action — the deductive system Mises built economics on, starting from the axiom that humans act purposefully.',
    example:
      'From the irreducible axiom "humans act," Mises derives the entire structure of economic law: ' +
      'time preference, marginal utility, the regression theorem, the calculation problem. ' +
      'Praxeology is rationalist where mainstream economics is empiricist — its laws are necessarily ' +
      'true given the axiom, not contingent on data. This methodological choice puts Austrians at ' +
      'sharp odds with the dominant tradition.',
    relatedTerms: ['catallactics', 'methodological-individualism'],
    modules:      ['origin'],
    quote: {
      text:   'Economics is not about things and tangible material objects; it is about men, their meanings and actions.',
      author: 'Ludwig von Mises',
      source: 'Human Action',
      year:   1949,
    },
  },
  {
    term: 'Regression theorem',
    slug: 'regression-theorem',
    definition: 'Mises\' theorem that the value of money traces back through purchasing-power memory to a moment when the monetary good had non-monetary use-value.',
    example:
      'Anticipated as an objection to the marginal-utility theory of money: how can demand for money ' +
      'depend on its purchasing power, when its purchasing power depends on demand? Mises\' answer is ' +
      'historical regress: today\'s purchasing power depends on yesterday\'s, which depended on the ' +
      'day before\'s, all the way back to a moment when the monetary good was demanded purely for non-' +
      'monetary use (gold for ornament, silver for utility). Bitcoin\'s "fair launch" history is the ' +
      'contemporary edge case.',
    relatedTerms: ['sound-money', 'subjective-value'],
    modules:      ['sound-money'],
  },
  {
    term: 'Sound money',
    slug: 'sound-money',
    definition: 'Money the issuing authority cannot easily debase. Historically gold; arguably now Bitcoin.',
    example:
      'A monetary good whose supply schedule is constrained by something other than political will. ' +
      'Gold is constrained by geology (mining adds ~1.5%/yr). Bitcoin is constrained by software ' +
      '(~0.8%/yr now, halving every 4 years toward zero by ~2140). Fiat is constrained by nothing: ' +
      'M2 has expanded 35× since 1971. Sound money preserves saver wealth across generations; fiat ' +
      'silently expropriates it.',
    relatedTerms: ['cantillon-effect', 'regression-theorem'],
    modules:      ['sound-money', 'why-now'],
  },
  {
    term: 'Spontaneous order',
    slug: 'spontaneous-order',
    definition: 'Coherent large-scale patterns that emerge from individual action without anyone designing them — language, common law, the price system.',
    example:
      'Hayek\'s central concept (borrowed from the Scottish Enlightenment). The market is a spontaneous ' +
      'order: no committee designed it, no chief planner runs it, but it produces, every day, the ' +
      'ongoing miracle of food on shelves, fuel in pumps, medicines in hospitals. Designers see the ' +
      'order and assume someone must have designed it. Hayek\'s lesson is that the most powerful kinds ' +
      'of order in human affairs emerge precisely *because* no one designed them.',
    relatedTerms: ['knowledge-problem', 'catallactics'],
    modules:      ['knowledge-problem'],
    quote: {
      text:   'The curious task of economics is to demonstrate to men how little they really know about what they imagine they can design.',
      author: 'Friedrich Hayek',
      source: 'The Fatal Conceit',
      year:   1988,
    },
  },
  {
    term: 'Subjective value',
    slug: 'subjective-value',
    definition: 'Value is not a property of things but a judgement made by acting individuals about their importance for human ends.',
    example:
      'The 1871 Mengerian revolution that broke with classical and Marxist labour-theories of value. ' +
      'A glass of water is not worth its labour cost or its physical mass — it is worth what its ' +
      'consumer judges it to be worth, in the situation it is consumed. Two people facing the same ' +
      'good can value it differently and both be right. From this, all of catallactics flows.',
    relatedTerms: ['marginal-utility', 'catallactics'],
    modules:      ['subjective-value'],
  },
  {
    term: 'Time preference',
    slug: 'time-preference',
    definition: 'The relative valuation of present versus future goods. Higher time preference = more impatient = higher natural interest rate.',
    example:
      'Time preference is the very essence of human action: to act is to choose between present and ' +
      'future. Aggregate time preference, expressed as voluntary saving and borrowing, determines the ' +
      'natural rate of interest — which in turn determines how long the structure of production can be. ' +
      'Central-bank manipulation of the rate is a manipulation of this most-fundamental coordination ' +
      'price; the consequences propagate everywhere.',
    relatedTerms: ['abct', 'malinvestment'],
    modules:      ['time-preference'],
  },
];

export const BESTIARY_BY_SLUG: Record<string, BestiaryEntry> =
  Object.fromEntries(BESTIARY.map((b) => [b.slug, b]));
