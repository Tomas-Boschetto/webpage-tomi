/** Accolade grouping by awarding institution (film + book wins). */

export type AccoladeMark =
	| 'oscar'
	| 'golden-globe'
	| 'bafta'
	| 'cannes'
	| 'venice'
	| 'berlin'
	| 'sag'
	| 'spirit'
	| 'critics-choice'
	| 'cesar'
	| 'goya'
	| 'pulitzer'
	| 'booker'
	| 'national-book'
	| 'nobel'
	| 'hugo'
	| 'nebula'
	| 'womens-prize'
	| 'goncourt'
	| 'other';

export interface AccoladeGroup {
	id: string;
	label: string;
	mark: AccoladeMark;
	awards: string[];
}

export interface AccoladesPayload {
	version: 1;
	source: 'wikidata' | 'manual';
	groups: AccoladeGroup[];
}

interface InstitutionRule {
	id: string;
	label: string;
	mark: AccoladeMark;
	/** Match against Wikidata "conferred by" label */
	conferred?: RegExp;
	/** Match against award title */
	title?: RegExp;
	/** Strip these prefixes from category names when grouping */
	strip?: RegExp;
}

const INSTITUTIONS: InstitutionRule[] = [
	{
		id: 'academy',
		label: 'Academy Awards',
		mark: 'oscar',
		conferred: /academy of motion picture arts and sciences/i,
		title: /\b(academy awards?|oscar)\b/i,
		strip: /^(academy awards?|oscars?)\s+(for\s+)?/i,
	},
	{
		id: 'golden-globe',
		label: 'Golden Globe Awards',
		mark: 'golden-globe',
		conferred: /hollywood\s*foreign\s*press|hfpa/i,
		title: /\bgolden\s+globe\b/i,
		strip: /^golden\s+globe\s+awards?\s+(for\s+)?/i,
	},
	{
		id: 'bafta',
		label: 'BAFTA',
		mark: 'bafta',
		conferred: /british academy of film and television arts|\bbafta\b/i,
		title: /\bbafta\b|british academy/i,
		strip: /^(bafta\s+award|british academy .+? award)\s+(for\s+)?/i,
	},
	{
		id: 'cannes',
		label: 'Cannes Film Festival',
		mark: 'cannes',
		conferred: /cannes/i,
		title: /\bcannes\b|\bpalme\s+d['’]?or\b/i,
	},
	{
		id: 'venice',
		label: 'Venice Film Festival',
		mark: 'venice',
		conferred: /venice/i,
		title: /\bvenice\b|\bgolden\s+lion\b/i,
	},
	{
		id: 'berlin',
		label: 'Berlin International Film Festival',
		mark: 'berlin',
		conferred: /berlin/i,
		title: /\bberlin(ale)?\b|\bgolden\s+bear\b/i,
	},
	{
		id: 'sag',
		label: 'SAG Awards',
		mark: 'sag',
		conferred: /screen actors guild|s\.?a\.?g\.?/i,
		title: /\bscreen actors guild\b|\bsag award\b/i,
		strip: /^(screen actors guild award|sag award)\s+(for\s+)?/i,
	},
	{
		id: 'spirit',
		label: 'Independent Spirit Awards',
		mark: 'spirit',
		conferred: /independent spirit|film independent/i,
		title: /\bindependent spirit\b/i,
		strip: /^independent spirit awards?\s+(for\s+)?/i,
	},
	{
		id: 'critics-choice',
		label: 'Critics’ Choice Awards',
		mark: 'critics-choice',
		conferred: /critics.? choice|broadcast film critics/i,
		title: /\bcritics.? choice\b/i,
		strip: /^critics.? choice\s+awards?\s+(for\s+)?/i,
	},
	{
		id: 'cesar',
		label: 'César Awards',
		mark: 'cesar',
		conferred: /académie des césar|césar/i,
		title: /\bcésar\b|\bcesar\b/i,
		strip: /^(césar|cesar)\s+awards?\s+(for\s+)?/i,
	},
	{
		id: 'goya',
		label: 'Goya Awards',
		mark: 'goya',
		conferred: /goya|academia de las artes/i,
		title: /\bgoya\b/i,
		strip: /^goya\s+awards?\s+(for\s+)?/i,
	},
	{
		id: 'pulitzer',
		label: 'Pulitzer Prize',
		mark: 'pulitzer',
		conferred: /pulitzer/i,
		title: /\bpulitzer\b/i,
		strip: /^pulitzer\s+prize\s+(for\s+)?/i,
	},
	{
		id: 'booker',
		label: 'Booker Prize',
		mark: 'booker',
		conferred: /booker\s+prize|booker\s+prize\s+foundation/i,
		title: /\bbooker\b/i,
		strip: /^(booker\s+prize|international\s+booker\s+prize)\s+(for\s+)?/i,
	},
	{
		id: 'national-book',
		label: 'National Book Awards',
		mark: 'national-book',
		conferred: /national\s+book\s+foundation|national\s+book\s+awards?/i,
		title: /\bnational\s+book\s+award/i,
		strip: /^national\s+book\s+awards?\s+(for\s+)?/i,
	},
	{
		id: 'nobel',
		label: 'Nobel Prize',
		mark: 'nobel',
		conferred: /nobel\s+foundation|swedish\s+academy/i,
		title: /\bnobel\s+prize\b/i,
		strip: /^nobel\s+prize\s+(in\s+|for\s+)?/i,
	},
	{
		id: 'hugo',
		label: 'Hugo Awards',
		mark: 'hugo',
		conferred: /world\s+science\s+fiction\s+society|\bhugo\b/i,
		title: /\bhugo\s+award/i,
		strip: /^hugo\s+awards?\s+(for\s+)?/i,
	},
	{
		id: 'nebula',
		label: 'Nebula Awards',
		mark: 'nebula',
		conferred: /science\s+fiction\s+(and\s+fantasy\s+)?writers|\bnebula\b/i,
		title: /\bnebula\s+award/i,
		strip: /^nebula\s+awards?\s+(for\s+)?/i,
	},
	{
		id: 'womens-prize',
		label: 'Women’s Prize for Fiction',
		mark: 'womens-prize',
		conferred: /women.?s\s+prize|orange\s+prize/i,
		title: /\bwomen.?s\s+prize|orange\s+prize\b/i,
		strip: /^(women.?s\s+prize\s+for\s+fiction|orange\s+prize)\s+(for\s+)?/i,
	},
	{
		id: 'goncourt',
		label: 'Prix Goncourt',
		mark: 'goncourt',
		conferred: /goncourt|académie\s+goncourt/i,
		title: /\bgoncourt\b/i,
		strip: /^(prix\s+)?goncourt\s+(for\s+)?/i,
	},
];

const MARK_LABELS: Record<AccoladeMark, string> = {
	oscar: 'Oscar',
	'golden-globe': 'Golden Globe',
	bafta: 'BAFTA',
	cannes: 'Cannes',
	venice: 'Venice',
	berlin: 'Berlinale',
	sag: 'SAG',
	spirit: 'Spirit',
	'critics-choice': 'Critics’ Choice',
	cesar: 'César',
	goya: 'Goya',
	pulitzer: 'Pulitzer',
	booker: 'Booker',
	'national-book': 'National Book Award',
	nobel: 'Nobel',
	hugo: 'Hugo',
	nebula: 'Nebula',
	'womens-prize': 'Women’s Prize',
	goncourt: 'Goncourt',
	other: 'Award',
};

export function markDisplayName(mark: AccoladeMark): string {
	return MARK_LABELS[mark];
}

function matchInstitution(
	awardTitle: string,
	conferredBy: string | null | undefined,
): InstitutionRule | null {
	const conferred = conferredBy?.trim() || '';
	for (const rule of INSTITUTIONS) {
		if (conferred && rule.conferred?.test(conferred)) return rule;
	}
	for (const rule of INSTITUTIONS) {
		if (rule.title?.test(awardTitle)) return rule;
	}
	return null;
}

function categoryName(awardTitle: string, rule: InstitutionRule | null): string {
	let name = awardTitle.trim();
	if (rule?.strip) {
		const stripped = name.replace(rule.strip, '').trim();
		if (stripped) name = stripped;
	}
	// Capitalize first letter if strip left lowercase
	if (name && name[0] === name[0].toLowerCase()) {
		name = name[0].toUpperCase() + name.slice(1);
	}
	return name || awardTitle.trim();
}

export function groupAwardWins(
	entries: Array<{ title: string; conferredBy?: string | null }>,
): AccoladeGroup[] {
	const byId = new Map<string, AccoladeGroup>();

	for (const entry of entries) {
		const title = entry.title.trim();
		if (!title) continue;
		const rule = matchInstitution(title, entry.conferredBy);
		const id = rule?.id || 'other';
		const label = rule?.label || (entry.conferredBy?.trim() || 'Other awards');
		const mark = rule?.mark || 'other';
		const category = categoryName(title, rule);

		let group = byId.get(id === 'other' ? `other:${label}` : id);
		if (!group) {
			group = { id: id === 'other' ? `other:${label}` : id, label, mark, awards: [] };
			byId.set(group.id, group);
		}
		if (!group.awards.includes(category)) group.awards.push(category);
	}

	const order = new Map(INSTITUTIONS.map((r, i) => [r.id, i]));
	return [...byId.values()]
		.map((g) => ({
			...g,
			awards: g.awards.sort((a, b) => a.localeCompare(b)),
		}))
		.sort((a, b) => {
			const ai = order.get(a.id) ?? 1000;
			const bi = order.get(b.id) ?? 1000;
			if (ai !== bi) return ai - bi;
			return a.label.localeCompare(b.label);
		});
}

export function serializeAccolades(
	groups: AccoladeGroup[],
	source: AccoladesPayload['source'] = 'wikidata',
): string | null {
	if (!groups.length) return null;
	const payload: AccoladesPayload = { version: 1, source, groups };
	return JSON.stringify(payload);
}

export function parseAccolades(raw: string | null | undefined): AccoladeGroup[] {
	if (!raw?.trim()) return [];
	const trimmed = raw.trim();

	if (trimmed.startsWith('{')) {
		try {
			const data = JSON.parse(trimmed) as AccoladesPayload;
			if (data?.version === 1 && Array.isArray(data.groups)) {
				return data.groups.filter(
					(g) => g && typeof g.label === 'string' && Array.isArray(g.awards) && g.awards.length,
				);
			}
		} catch {
			/* fall through */
		}
	}

	// Human-editable institution blocks:
	// Academy Awards (Oscar)
	// • Best Picture
	const blockGroups: AccoladeGroup[] = [];
	const blocks = trimmed.split(/\n{2,}/);
	let lookedLikeBlocks = false;
	for (const block of blocks) {
		const lines = block
			.split('\n')
			.map((l) => l.trim())
			.filter(Boolean);
		if (lines.length < 2) continue;
		const awardLines = lines
			.slice(1)
			.map((l) => l.replace(/^[•\-\*]\s*/, '').trim())
			.filter(Boolean);
		if (!awardLines.length) continue;
		const header = lines[0].replace(/\s*\(Oscar\)\s*$/i, '').trim();
		lookedLikeBlocks = true;
		const rule = matchInstitution(header, header);
		blockGroups.push({
			id: rule?.id || `other:${header}`,
			label: rule?.label || header,
			mark: rule?.mark || 'other',
			awards: awardLines,
		});
	}
	if (lookedLikeBlocks && blockGroups.length) return blockGroups;

	// Legacy: "Award A; Award B"
	const titles = trimmed
		.split(/\s*;\s*|\n+/)
		.map((s) => s.replace(/^[•\-\*]\s*/, '').trim())
		.filter(Boolean);
	return groupAwardWins(titles.map((title) => ({ title })));
}

/** Pretty text for the admin textarea. */
export function formatAccoladesForAdmin(raw: string | null | undefined): string {
	const groups = parseAccolades(raw);
	if (!groups.length) return raw?.trim() || '';
	return groups
		.map((g) => {
			const markNote = g.mark === 'oscar' ? ' (Oscar)' : '';
			const lines = g.awards.map((a) => `• ${a}`).join('\n');
			return `${g.label}${markNote}\n${lines}`;
		})
		.join('\n\n');
}

/** Normalize admin input back to stored JSON (or null). */
export function normalizeAccoladesInput(
	raw: string | null | undefined,
	sourceHint: AccoladesPayload['source'] = 'manual',
): string | null {
	if (!raw?.trim()) return null;
	let source = sourceHint;
	if (raw.trim().startsWith('{')) {
		try {
			const data = JSON.parse(raw) as AccoladesPayload;
			if (data.source === 'wikidata' || data.source === 'manual') source = data.source;
		} catch {
			/* keep hint */
		}
	}
	const groups = parseAccolades(raw);
	if (!groups.length) return null;
	// Prefer dropping trailing institutions over truncating JSON mid-string.
	let payload = serializeAccolades(groups, source);
	while (payload && payload.length > 2500 && groups.length > 1) {
		groups.pop();
		payload = serializeAccolades(groups, source);
	}
	return payload && payload.length <= 2500 ? payload : null;
}

export function accoladesSource(raw: string | null | undefined): AccoladesPayload['source'] | null {
	if (!raw?.trim()) return null;
	if (!raw.trim().startsWith('{')) return 'manual';
	try {
		const data = JSON.parse(raw) as AccoladesPayload;
		return data.source || 'wikidata';
	} catch {
		return 'manual';
	}
}

/** Unique institution labels across recommendations (for filters). */
export function extractAccoladeInstitutions(
	items: Array<{ type?: string; accolades?: string | null }>,
): string[] {
	const set = new Set<string>();
	for (const item of items) {
		for (const group of parseAccolades(item.accolades)) {
			if (group.label) set.add(group.label);
		}
	}
	return [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

export function matchesAccoladeInstitution(
	item: { type?: string; accolades?: string | null },
	institution: string | null | undefined,
): boolean {
	if (!institution?.trim()) return true;
	const needle = institution.trim().toLowerCase();
	return parseAccolades(item.accolades).some((g) => g.label.trim().toLowerCase() === needle);
}
