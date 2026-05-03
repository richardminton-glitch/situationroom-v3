/**
 * The Heretics — bio cards for the school's principal figures.
 *
 * All eight portraits are Stability-generated assets, sharing the
 * locked editorial style: black ground, halftone-shaded faces, parchment
 * accents in red/gold/cream. Portraits live under
 * /public/images/vienna-school/heretic-{slug}.png.
 */

import type { VsQuote } from '../types';

export interface Heretic {
  slug:        string;
  name:        string;
  /** Short attribution shown under the name on grid cards. */
  born:        number;
  died:        number | null;       // null = living
  oneLine:     string;              // single-line summary for grid card
  portrait:    string | null;       // path under /images/vienna-school/, or null for placeholder
  bio:         string[];            // paragraphs
  signature?:  VsQuote;
  keyWorks:    KeyWork[];
  modules:     string[];            // slugs of modules where this figure features
}

export interface KeyWork {
  title:       string;
  year:        number;
  oneLine:     string;
  freePdfLink?: string;
  amazonLink?:  string;
}

export const HERETICS: Heretic[] = [
  {
    slug: 'menger',
    name: 'Carl Menger',
    born: 1840,
    died: 1921,
    oneLine: 'Founder. Marginalist revolution, 1871.',
    portrait: '/images/vienna-school/heretic-menger.png',
    bio: [
      'Carl Menger was a Viennese journalist-turned-economist whose 1871 *Principles of Economics* ' +
      'launched the marginalist revolution and, with it, the school that bears his city\'s name. ' +
      'Working in parallel with William Stanley Jevons in Britain and Léon Walras in Switzerland, ' +
      'Menger broke decisively with the classical labour-theory of value and replaced it with the ' +
      'subjective-marginalist theory that still anchors mainstream price theory today.',
      'What set Menger apart from his fellow marginalists was the methodological depth of his ' +
      'argument. Where Walras went mathematical, Menger went philosophical: value lives in the ' +
      'minds of acting individuals, not in mathematical aggregates. This insight — and his ' +
      'subsequent *Methodenstreit* (method dispute) with the German Historical School — established ' +
      'the methodological commitments that the Austrian tradition would carry forward through ' +
      'Mises, Hayek, and beyond.',
    ],
    signature: {
      text:   'Value is therefore nothing inherent in goods, no property of them, nor an independent thing existing by itself.',
      author: 'Carl Menger',
      source: 'Principles of Economics',
      year:   1871,
    },
    keyWorks: [
      {
        title: 'Principles of Economics',
        year: 1871,
        oneLine: 'The founding text. Subjective marginal value, demolished classical labour theory in 200 readable pages.',
        freePdfLink: 'https://mises.org/library/book/principles-economics',
      },
      {
        title: 'Investigations into the Method of the Social Sciences',
        year: 1883,
        oneLine: 'The methodological treatise that launched the Methodenstreit with the German Historical School.',
        freePdfLink: 'https://mises.org/library/book/investigations-method-social-sciences',
      },
    ],
    modules: ['origin', 'subjective-value'],
  },

  {
    slug: 'bohm-bawerk',
    name: 'Eugen von Böhm-Bawerk',
    born: 1851,
    died: 1914,
    oneLine: 'Demolished Marx. Time, capital, interest — first principles.',
    portrait: '/images/vienna-school/heretic-bohm-bawerk.png',
    bio: [
      'Böhm-Bawerk was Menger\'s most distinguished student and the man who took the Austrian framework ' +
      'into direct combat with Karl Marx — and won. His 1884 *Capital and Interest* dismantled the ' +
      'labour theory of value as a load-bearing claim of socialism, and his *Karl Marx and the Close ' +
      'of His System* (1896) is still the cleanest demolition of *Capital* Volume III ever written.',
      'Three times Austrian Finance Minister and a teacher of both Mises and Schumpeter, ' +
      'Böhm-Bawerk introduced **time preference** as a foundational economic concept and laid the ' +
      'groundwork for the Austrian theory of capital structure. His insight that production is a ' +
      'time-spanning process — and that interest is the price of waiting — reappears in Module 4 ' +
      'as the Hayekian triangle.',
    ],
    signature: {
      text:   'The value of a thing is the amount of advantage we expect to derive from it; and from this point of view there is nothing absurd in the proposition that water has more value than diamonds.',
      author: 'Eugen von Böhm-Bawerk',
      source: 'Capital and Interest',
      year:   1884,
    },
    keyWorks: [
      {
        title: 'Capital and Interest',
        year: 1884,
        oneLine: 'Three-volume treatise. The original Austrian theory of time preference and capital structure.',
        freePdfLink: 'https://mises.org/library/book/capital-and-interest',
      },
      {
        title: 'Karl Marx and the Close of His System',
        year: 1896,
        oneLine: 'The decisive critique. After Böhm-Bawerk, the labour theory of value was an artefact, not a live theory.',
        freePdfLink: 'https://mises.org/library/book/karl-marx-and-close-his-system',
      },
    ],
    modules: ['origin', 'subjective-value', 'time-preference'],
  },

  {
    slug: 'mises',
    name: 'Ludwig von Mises',
    born: 1881,
    died: 1973,
    oneLine: 'The systematiser. Praxeology, calculation, the theory of money.',
    portrait: '/images/vienna-school/heretic-mises.png',
    bio: [
      'Ludwig von Mises is the figure around whom the modern Austrian school is organised. A student ' +
      'of Böhm-Bawerk\'s, he extended the marginalist project into money (*Theory of Money and Credit*, ' +
      '1912), socialism (*Socialism*, 1922 — including the calculation argument that demolished the ' +
      'feasibility of central planning), and the systematic treatise that codified the entire framework ' +
      '(*Human Action*, 1949).',
      'Forced into exile by the Nazi annexation of Austria in 1938, Mises spent his second career at ' +
      'NYU teaching a private seminar that produced the next generation: Murray Rothbard, Israel Kirzner, ' +
      'Hans Sennholz. Where Hayek made the public-facing case in books like *The Road to Serfdom*, ' +
      'Mises remained the rigorous internal foundation. Every subsequent Austrian thinker is, at some ' +
      'level, working out implications of Misesian premises.',
    ],
    signature: {
      text:   'There is no means of avoiding the final collapse of a boom brought about by credit expansion.',
      author: 'Ludwig von Mises',
      source: 'Human Action',
      year:   1949,
    },
    keyWorks: [
      {
        title: 'Human Action',
        year: 1949,
        oneLine: 'The systematic treatise. ~900 pages. Read once a decade and find new things.',
        freePdfLink: 'https://mises.org/library/book/human-action-0',
      },
      {
        title: 'The Theory of Money and Credit',
        year: 1912,
        oneLine: 'Marginal-utility theory extended to money itself. Foundation of Austrian Business Cycle Theory.',
        freePdfLink: 'https://mises.org/library/book/theory-money-and-credit',
      },
      {
        title: 'Socialism',
        year: 1922,
        oneLine: 'The systematic critique that produced the calculation argument. Hayek said it changed his life.',
        freePdfLink: 'https://mises.org/library/book/socialism-economic-and-sociological-analysis',
      },
    ],
    modules: ['origin', 'sound-money', 'time-preference', 'knowledge-problem', 'why-now'],
  },

  {
    slug: 'hayek',
    name: 'Friedrich Hayek',
    born: 1899,
    died: 1992,
    oneLine: 'The communicator. Knowledge problem, spontaneous order, Nobel laureate.',
    portrait: '/images/vienna-school/heretic-hayek.png',
    bio: [
      'Friedrich Hayek was Mises\' most distinguished student and the figure who took Austrian ideas ' +
      'into the post-war public conversation. *The Road to Serfdom* (1944) — written in wartime as a ' +
      'warning that economic planning is the road to political tyranny — became a transatlantic ' +
      'bestseller and the cornerstone of post-war classical-liberal thought.',
      'His deepest contribution, however, may be the 1945 essay *The Use of Knowledge in Society*, ' +
      'which set out the **knowledge problem** as Module 5 of this curriculum explores it. Awarded ' +
      'the Nobel in 1974 for work on prices and information, Hayek made the Austrian framework ' +
      'unavoidable to any serious economist — even those who disagreed with it.',
    ],
    signature: {
      text:   'The curious task of economics is to demonstrate to men how little they really know about what they imagine they can design.',
      author: 'Friedrich Hayek',
      source: 'The Fatal Conceit',
      year:   1988,
    },
    keyWorks: [
      {
        title: 'The Road to Serfdom',
        year: 1944,
        oneLine: 'The wartime warning. Economic planning is the road to political tyranny. Bestseller.',
        amazonLink: 'https://www.amazon.com/Road-Serfdom-Documents-Definitive-Collected/dp/0226320553',
      },
      {
        title: 'The Use of Knowledge in Society',
        year: 1945,
        oneLine: 'Eleven pages. Won him the Nobel. Read twice.',
        freePdfLink: 'https://mises.org/library/use-knowledge-society',
      },
      {
        title: 'The Constitution of Liberty',
        year: 1960,
        oneLine: 'The systematic political-economic treatise. Hayek\'s answer to what a free society looks like.',
        amazonLink: 'https://www.amazon.com/Constitution-Liberty-Definitive-Collected-Works/dp/0226315398',
      },
    ],
    modules: ['origin', 'time-preference', 'knowledge-problem', 'why-now'],
  },

  {
    slug: 'rothbard',
    name: 'Murray Rothbard',
    born: 1926,
    died: 1995,
    oneLine: 'The radical. Misesian system, anarcho-capitalism, devastating prose.',
    portrait: '/images/vienna-school/heretic-rothbard.png',
    bio: [
      'Murray Rothbard took Mises\' system, rebuilt it from first principles in *Man, Economy, and ' +
      'State* (1962), and added the political conclusion Mises had been too cautious to draw: ' +
      'anarcho-capitalism. A polymath who wrote with unusual clarity and bite, Rothbard produced ' +
      'monetary history (*A History of Money and Banking in the United States*), business-cycle ' +
      'analysis (*America\'s Great Depression*), and political philosophy (*The Ethics of Liberty*) ' +
      'across a four-decade career.',
      'Where Mises was the Austrian system\'s architect and Hayek its diplomat, Rothbard was its ' +
      'polemicist. He is the figure most responsible for the libertarian movement of the late 20th ' +
      'century — for better and worse — and the indispensable bridge between the European Austrians ' +
      'and the modern American liberty movement.',
    ],
    signature: {
      text:   'It is no crime to be ignorant of economics. But it is totally irresponsible to have a loud and vociferous opinion on economic subjects while remaining in this state of ignorance.',
      author: 'Murray Rothbard',
      source: 'Education: Free and Compulsory',
      year:   1971,
    },
    keyWorks: [
      {
        title: 'Man, Economy, and State',
        year: 1962,
        oneLine: 'Rothbard\'s reconstruction of the Misesian system from first principles. Magisterial.',
        freePdfLink: 'https://mises.org/library/book/man-economy-and-state-power-and-market',
      },
      {
        title: 'America\'s Great Depression',
        year: 1963,
        oneLine: 'Austrian Business Cycle Theory applied to 1929. Devastating.',
        freePdfLink: 'https://mises.org/library/book/americas-great-depression',
      },
      {
        title: 'What Has Government Done to Our Money?',
        year: 1963,
        oneLine: 'Sixty-page demolition of fiat currency. Read in one sitting.',
        freePdfLink: 'https://mises.org/library/book/what-has-government-done-our-money',
      },
    ],
    modules: ['origin', 'sound-money', 'time-preference', 'why-now'],
  },

  {
    slug: 'hoppe',
    name: 'Hans-Hermann Hoppe',
    born: 1949,
    died: null,
    oneLine: 'Living. Property rights, argumentation ethics, political-philosophical sharpener.',
    portrait: '/images/vienna-school/heretic-hoppe.png',
    bio: [
      'Hans-Hermann Hoppe is Rothbard\'s intellectual heir and the figure most responsible for ' +
      'sharpening the political-philosophical edge of the modern Austrian school. *A Theory of ' +
      'Socialism and Capitalism* (1989) and *Democracy: The God That Failed* (2001) extend the ' +
      'Misesian-Rothbardian system into a comprehensive critique of the modern democratic state ' +
      'as such — not merely a critique of particular policies but of the political form itself.',
      'Hoppe\'s **argumentation ethics** is among the most elegant attempts to provide a ' +
      'praxeological foundation for property-rights libertarianism. Whatever one makes of the ' +
      'conclusions, his intellectual lineage to Mises (and through Mises to Menger) is direct: ' +
      'methodological individualism, deductive rigour, and a willingness to follow the argument ' +
      'wherever it leads.',
    ],
    signature: {
      text:   'We are at the brink of an abyss. The whole world is in danger of becoming a single planetary state.',
      author: 'Hans-Hermann Hoppe',
      source: 'Democracy: The God That Failed',
      year:   2001,
    },
    keyWorks: [
      {
        title: 'A Theory of Socialism and Capitalism',
        year: 1989,
        oneLine: 'The property-rights argument sharpened. Argumentation ethics introduced.',
        freePdfLink: 'https://mises.org/library/book/theory-socialism-and-capitalism',
      },
      {
        title: 'Democracy: The God That Failed',
        year: 2001,
        oneLine: 'A sustained critique of the democratic form itself. Polarising. Important.',
        amazonLink: 'https://www.amazon.com/Democracy-God-That-Failed-Civilization/dp/0765808684',
      },
    ],
    modules: ['origin', 'why-now'],
  },

  {
    slug: 'salerno',
    name: 'Joseph Salerno',
    born: 1950,
    died: null,
    oneLine: 'Living. Modern monetary theorist, calculation argument scholar.',
    portrait: '/images/vienna-school/heretic-salerno.png',
    bio: [
      'Joseph Salerno is among the most rigorous contemporary scholars of Austrian monetary theory ' +
      'and the calculation argument. His work has been instrumental in clarifying the distinction ' +
      'between the Misesian and Hayekian readings of the calculation problem, and in re-establishing ' +
      'the case for sound money against modern macroeconomic orthodoxy.',
      'Long-time editor of the *Quarterly Journal of Austrian Economics* and academic vice-president ' +
      'of the Mises Institute, Salerno is the contemporary Austrian whose work most directly ' +
      'connects the European founders\' rigour with current monetary debates.',
    ],
    keyWorks: [
      {
        title: 'Money: Sound and Unsound',
        year: 2010,
        oneLine: 'Collected essays on monetary theory. The contemporary Austrian case for hard money.',
        freePdfLink: 'https://mises.org/library/book/money-sound-and-unsound',
      },
    ],
    modules: ['sound-money'],
  },

  {
    slug: 'hulsmann',
    name: 'Jörg Guido Hülsmann',
    born: 1966,
    died: null,
    oneLine: 'Living. Ethics of money production, Misesian biographer, contemporary scholar.',
    portrait: '/images/vienna-school/heretic-hulsmann.png',
    bio: [
      'Jörg Guido Hülsmann is a German economist whose work brings a distinctive moral-philosophical ' +
      'edge to the contemporary Austrian conversation. *The Ethics of Money Production* (2008) is the ' +
      'cleanest modern Misesian re-statement of the case for sound money against fiat — and against ' +
      'the moral consequences of inflation as a form of stealth taxation.',
      'His monumental *Mises: The Last Knight of Liberalism* (2007) is the definitive English-language ' +
      'biography of Ludwig von Mises and an essential intellectual history of the Austrian school in ' +
      'its European phase.',
    ],
    keyWorks: [
      {
        title: 'The Ethics of Money Production',
        year: 2008,
        oneLine: 'Modern Misesian re-statement of the moral case against fiat.',
        freePdfLink: 'https://mises.org/library/book/ethics-money-production',
      },
      {
        title: 'Mises: The Last Knight of Liberalism',
        year: 2007,
        oneLine: 'The definitive Mises biography and intellectual history.',
        freePdfLink: 'https://mises.org/library/book/mises-last-knight-liberalism',
      },
    ],
    modules: ['sound-money'],
  },
];

export const HERETIC_BY_SLUG: Record<string, Heretic> =
  Object.fromEntries(HERETICS.map((h) => [h.slug, h]));
