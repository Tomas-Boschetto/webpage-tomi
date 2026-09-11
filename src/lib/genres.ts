/** Canonical genres for movies & books — map free-text source labels onto these. */

export const STANDARD_GENRES = [
	'Drama',
	'Comedy',
	'Action',
	'Adventure',
	'Mystery',
	'Thriller',
	'Crime',
	'Romance',
	'Science Fiction',
	'Fantasy',
	'Horror',
	'History',
	'War',
	'Western',
	'Biography & Memoir',
	'Documentary',
	'Family',
	'Animation',
	'Music',
	'Nonfiction',
] as const;

export type StandardGenre = (typeof STANDARD_GENRES)[number];

interface GenreRule {
	genre: StandardGenre;
	/** Match against source genre / subject strings */
	match: RegExp;
	weight: number;
}

/** Higher weight wins when a label could map to multiple buckets. */
const RULES: GenreRule[] = [
	{ genre: 'Science Fiction', match: /\bsci[\s-]?fi\b|\bscience fiction\b|\bdystopi|\bcyberpunk/i, weight: 12 },
	{ genre: 'Fantasy', match: /\bfantasy\b|\bmagical realism\b|\bmythology\b|\bsuperhero|\bepic fantasy/i, weight: 12 },
	{ genre: 'Horror', match: /\bhorror\b|\bgothic\b|\bvampire\b|\bzombie|\bsupernatural horror/i, weight: 12 },
	{ genre: 'Animation', match: /\banimation\b|\banime\b|\banimated\b|\bcartoon/i, weight: 12 },
	{ genre: 'Western', match: /\bwestern\b|\bcowboy|\bfrontier/i, weight: 11 },
	{ genre: 'War', match: /\bwar\b|\bmilitary\b|\bworld war|\bcivil war|\bcombat/i, weight: 11 },
	{ genre: 'Music', match: /\bmusical\b|\bmusic\b|\bconcert|\bopera\b|\bjazz\b/i, weight: 11 },
	{ genre: 'Biography & Memoir', match: /\bbiograph|\bmemoir\b|\bautobiograph|\blife of\b/i, weight: 11 },
	{ genre: 'Documentary', match: /\bdocumentary\b|\bdocudrama|\bnon[\s-]?fiction film/i, weight: 11 },
	{ genre: 'Crime', match: /\bcrime\b|\bmafia\b|\bgangster|\bheist\b|\btrue crime/i, weight: 10 },
	{ genre: 'Mystery', match: /\bmystery\b|\bdetective\b|\bwhodunit|\bcozy mystery/i, weight: 10 },
	{ genre: 'Thriller', match: /\bthriller\b|\bsuspense\b|\bnoir\b|\bspy\b|\bespionage|\bpsychological thriller/i, weight: 10 },
	{ genre: 'Romance', match: /\bromance\b|\bromantic\b|\blove stor|\brom[- ]?com/i, weight: 10 },
	{ genre: 'Action', match: /\baction\b|\bmartial arts\b|\bkung fu|\bsuperhero film/i, weight: 9 },
	{ genre: 'Adventure', match: /\badventure\b|\bquest\b|\bexpedition|\bswashbuckl/i, weight: 9 },
	{ genre: 'History', match: /\bhistory\b|\bhistorical\b|\bancient\b|\bperiod (drama|piece)/i, weight: 9 },
	{ genre: 'Family', match: /\bfamily\b|\bchildren'?s\b|\bkids\b|\byoung adult|\bya fiction|\bjuvenile/i, weight: 8 },
	{ genre: 'Comedy', match: /\bcomedy\b|\bcomic\b|\bhumor\b|\bhumour\b|\bsatire\b|\bparody|\bstand[- ]?up/i, weight: 8 },
	{
		genre: 'Nonfiction',
		match:
			/\bnon[\s-]?fiction\b|\bessay\b|\bself[\s-]?help\b|\bphilosophy\b|\bscience\b|\bpolitics\b|\breligion\b|\btravel\b|\bcook|\bbusiness\b|\bpsychology/i,
		weight: 7,
	},
	{
		genre: 'Drama',
		match: /\bdrama\b|\bliterary\b|\bfiction\b|\bclassic\b|\btragedy\b|\bnovel\b|\bmelodrama/i,
		weight: 3,
	},
];

/**
 * Map arbitrary source genre/subject labels onto up to `max` standard categories.
 * Picks the strongest matches.
 */
export function mapToStandardGenres(
	labels: Array<string | null | undefined>,
	max = 3,
): string | null {
	const scores = new Map<StandardGenre, number>();

	for (const raw of labels) {
		const label = raw?.trim();
		if (!label || label.length < 3 || label.length > 60) continue;
		if (/reading level|grade\s*\d|accessible|daisy|overdrive|large type|isbn/i.test(label)) {
			continue;
		}

		let best: { genre: StandardGenre; weight: number } | null = null;
		for (const rule of RULES) {
			if (!rule.match.test(label)) continue;
			if (!best || rule.weight > best.weight) {
				best = { genre: rule.genre, weight: rule.weight };
			}
		}
		if (!best) continue;
		scores.set(best.genre, (scores.get(best.genre) || 0) + best.weight);
	}

	const ranked = [...scores.entries()]
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.map(([genre]) => genre)
		.slice(0, max);

	if (!ranked.length) return null;
	return ranked.join(', ');
}

export function isStandardGenre(value: string): value is StandardGenre {
	return (STANDARD_GENRES as readonly string[]).includes(value);
}
