/** Letters that NFD does not split into base letter + accent. */
const FOLDED_LETTERS: Record<string, string> = {
	ø: 'o',
	æ: 'ae',
	œ: 'oe',
	ß: 'ss',
	ł: 'l',
	đ: 'd',
	ð: 'd',
	þ: 'th',
	ı: 'i',
};

/** Lowercase, accent-free text so "sabato" matches "Sábato". Shared by server render and browser. */
export function normalizeSearch(value: string | null | undefined): string {
	return String(value ?? '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[øæœßłđðþı]/g, (ch) => FOLDED_LETTERS[ch] ?? ch)
		.replace(/\s+/g, ' ')
		.trim();
}

export function searchHaystack(parts: Array<string | null | undefined>): string {
	return normalizeSearch(parts.filter(Boolean).join(' '));
}

/** Every word of the query must appear somewhere in the haystack. */
export function matchesSearch(haystack: string, query: string): boolean {
	const terms = normalizeSearch(query).split(' ').filter(Boolean);
	if (terms.length === 0) return true;
	return terms.every((term) => haystack.includes(term));
}
