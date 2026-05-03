/**
 * Spot-the-school — Module 1 interactive dataset.
 *
 * 12 attributed quotes from real economists, evenly split between the
 * Austrian and mainstream/Keynesian traditions. The reader has to commit
 * to a guess before each reveal; correctness is less interesting than
 * the *why* — the one-line explanation surfaces what makes the quote
 * characteristic of its tradition. Reading those explanations end-to-end
 * is the framework's lens being installed by induction.
 *
 * Curation principles:
 *   - Real quotes only, with sources you can verify
 *   - Mix of obvious tells (Mises on credit, Krugman on space aliens)
 *     and subtle traps (an Austrian sounding technocratic, a Keynesian
 *     sounding moral)
 *   - Topic spread: money, planning, value, the business cycle, debt
 *   - No straw men on either side — every mainstream quote is from a
 *     serious mainstream voice, not a caricature
 */

export type School = 'austrian' | 'mainstream';

export interface QuoteRound {
  /** Stable id for client-side answer tracking. */
  id:          string;
  text:        string;
  author:      string;
  /** Brief role / affiliation at the time of the quote. */
  role:        string;
  source:      string;
  year?:       number;
  school:      School;
  /** One-line explanation of why this is characteristic of its tradition.
   *  Shown after the user commits a guess. */
  why:         string;
}

export const SPOT_THE_SCHOOL: QuoteRound[] = [
  {
    id: 'q1', school: 'austrian',
    text:   'There is no means of avoiding the final collapse of a boom brought about by credit expansion.',
    author: 'Ludwig von Mises', role: 'Austrian economist', source: 'Human Action',
    year:   1949,
    why:    'Treating recessions as the inevitable correction of a credit-induced boom — rather than a failure of demand or animal spirits — is the bedrock Austrian Business Cycle position. No mainstream economist would phrase it this fatalistically.',
  },
  {
    id: 'q2', school: 'mainstream',
    text:   'In the long run we are all dead.',
    author: 'John Maynard Keynes', role: 'Cambridge / HM Treasury', source: 'A Tract on Monetary Reform',
    year:   1923,
    why:    'The defining mainstream stance: prioritise the short-run effects of intervention over its long-run consequences. Austrians read this as a confession that the framework has no theory of capital structure across time.',
  },
  {
    id: 'q3', school: 'mainstream',
    text:   'If we discovered that space aliens were planning to attack and we needed a massive buildup to counter the space alien threat, this slump would be over in 18 months.',
    author: 'Paul Krugman', role: 'Princeton / NYT columnist', source: 'CNN interview',
    year:   2011,
    why:    'A consummate Keynesian-multiplier thought experiment: the *purpose* of spending is irrelevant, only its *quantity* matters. Austrians reject this — spending on capital projects no one wanted is malinvestment whether the threat was alien or domestic.',
  },
  {
    id: 'q4', school: 'austrian',
    text:   'The curious task of economics is to demonstrate to men how little they really know about what they imagine they can design.',
    author: 'Friedrich Hayek', role: 'LSE / Chicago / Freiburg', source: 'The Fatal Conceit',
    year:   1988,
    why:    'The hallmark Austrian humility about the limits of design — economics as the study of *unintended* consequences and emergent order, not policy levers. No mainstream economist titles their book *The Fatal Conceit*.',
  },
  {
    id: 'q5', school: 'mainstream',
    text:   'The impact on the broader economy and financial markets of the problems in the subprime market seems likely to be contained.',
    author: 'Ben Bernanke', role: 'Federal Reserve Chair', source: 'Testimony to Congress',
    year:   2007,
    why:    'A confident systemic forecast from the apex of mainstream macro, eight months before Bear Stearns. Austrians had spent five years warning about the housing-credit bubble using exactly the structural framework Bernanke\'s models couldn\'t see.',
  },
  {
    id: 'q6', school: 'austrian',
    text:   'Economics is not about things and tangible material objects; it is about men, their meanings and actions.',
    author: 'Ludwig von Mises', role: 'NYU (in exile)', source: 'Human Action',
    year:   1949,
    why:    'Methodological individualism in one sentence. Mainstream macro spends most of its time on things (GDP, M2, inventories, productivity) and aggregates. Austrians always reduce to the level of the acting person.',
  },
  {
    id: 'q7', school: 'mainstream',
    text:   'Anything that is technically feasible is financially affordable.',
    author: 'Stephanie Kelton', role: 'Stony Brook / MMT', source: 'The Deficit Myth',
    year:   2020,
    why:    'A pure Modern Monetary Theory claim — sovereign issuers cannot run out of their own currency, so spending is constrained only by real resources. Austrians would call this the calculation problem in a new uniform: pretending money supply is irrelevant to capital allocation.',
  },
  {
    id: 'q8', school: 'austrian',
    text:   'It is no crime to be ignorant of economics. But it is totally irresponsible to have a loud and vociferous opinion on economic subjects while remaining in this state of ignorance.',
    author: 'Murray Rothbard', role: 'NYU / UNLV', source: 'Education: Free and Compulsory',
    year:   1971,
    why:    'The bite is unmistakably Rothbardian — Austrians treat economic ignorance as a moral, not just intellectual, failure because the consequences (inflation, bailouts, planning) fall on real people. Mainstream economists rarely scold the public.',
  },
  {
    id: 'q9', school: 'mainstream',
    text:   'Would I say there will never, ever be another financial crisis? Probably that would be going too far. But I do think we\'re much safer, and I hope that it will not be in our lifetimes and I don\'t believe it will be.',
    author: 'Janet Yellen', role: 'Federal Reserve Chair', source: 'British Academy speech',
    year:   2017,
    why:    'Mainstream confidence in regulatory architecture (Dodd-Frank, post-GFC stress tests) — the system has been *fixed*. Six years later: SVB, Signature, First Republic, regional-bank duration losses. Austrians would have predicted the framework couldn\'t survive its own next test.',
  },
  {
    id: 'q10', school: 'austrian',
    text:   'In the absence of the gold standard, there is no way to protect savings from confiscation through inflation. There is no safe store of value.',
    author: 'Alan Greenspan', role: 'Pre-Fed-chair Greenspan, before he changed his mind', source: 'Gold and Economic Freedom',
    year:   1966,
    why:    'A trick — this is the *young* Greenspan writing for an Ayn Rand publication, two decades before he ran the Fed. The argument is pure Mises. Greenspan as Fed chair would presided over exactly the inflation he warned against.',
  },
  {
    id: 'q11', school: 'mainstream',
    text:   'We\'re not even thinking about thinking about raising interest rates.',
    author: 'Jerome Powell', role: 'Federal Reserve Chair', source: 'FOMC press conference',
    year:   2020,
    why:    'A textbook Federal Reserve forward-guidance posture from the dovish phase of 2020. Within 18 months CPI hit 9% and the Fed embarked on the fastest tightening cycle in history. Austrians had warned the moment M2 expanded by trillions that this exact sequence was inevitable.',
  },
  {
    id: 'q12', school: 'austrian',
    text:   'The knowledge of the circumstances of which we must make use never exists in concentrated or integrated form, but solely as the dispersed bits of incomplete and frequently contradictory knowledge which all the separate individuals possess.',
    author: 'Friedrich Hayek', role: 'LSE', source: 'The Use of Knowledge in Society',
    year:   1945,
    why:    'The dispersed-knowledge problem in a single sentence — the argument that won Hayek the Nobel and that no central planner has ever overcome. Mainstream economics often treats information as a public input that better data could solve; Hayek treats it as an irreducible feature of action.',
  },
];

/**
 * Final score interpretations. Used by the SpotTheSchool component to
 * close the game with a tone-appropriate one-liner.
 */
export interface ScoreVerdict {
  threshold: number;
  band:      string;
  message:   string;
}

export const VERDICTS: ScoreVerdict[] = [
  { threshold: 11, band: 'You already think Austrian.',
    message: 'Whether you knew the names or not, your ear is trained. Module 2 will sharpen what you\'re already hearing.' },
  { threshold:  9, band: 'Strong intuition.',
    message: 'You can hear the difference clearly. The remaining modules calibrate the edge cases — credit cycles, calculation, why-now.' },
  { threshold:  7, band: 'Decent calibration.',
    message: 'You\'re catching the obvious tells but the subtle ones got past you. That\'s exactly what the next five modules fix.' },
  { threshold:  4, band: 'Two schools sound similar from the outside.',
    message: 'They aren\'t. Modules 2 through 5 are the depth charges that explode the surface resemblance.' },
  { threshold:  0, band: 'Most economic writing you\'ve absorbed is from one tradition.',
    message: 'The other tradition is the rest of this curriculum. Start with Module 2 and let it accumulate.' },
];

export function verdictFor(score: number): ScoreVerdict {
  return VERDICTS.find((v) => score >= v.threshold) ?? VERDICTS[VERDICTS.length - 1];
}
