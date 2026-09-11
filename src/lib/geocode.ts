export type GeocodeHit = {
	displayName: string;
	placeName: string;
	lat: number;
	lng: number;
	countryCode: string;
	countryName: string;
};

type NominatimAddress = {
	country?: string;
	country_code?: string;
	city?: string;
	town?: string;
	village?: string;
	hamlet?: string;
	municipality?: string;
	county?: string;
	state?: string;
	suburb?: string;
	neighbourhood?: string;
	road?: string;
	tourism?: string;
	amenity?: string;
	leisure?: string;
	building?: string;
};

type NominatimResult = {
	display_name?: string;
	lat?: string;
	lon?: string;
	name?: string;
	address?: NominatimAddress;
};

const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';

function pickPlaceName(hit: NominatimResult): string {
	const address = hit.address;
	const named =
		hit.name?.trim() ||
		address?.tourism ||
		address?.amenity ||
		address?.leisure ||
		address?.building ||
		address?.suburb ||
		address?.neighbourhood ||
		address?.road ||
		address?.city ||
		address?.town ||
		address?.village ||
		address?.hamlet ||
		address?.municipality ||
		address?.county ||
		address?.state;
	if (named?.trim()) return named.trim();
	const display = String(hit.display_name || '').trim();
	if (!display) return '';
	return display.split(',')[0]?.trim() || display;
}

function mapHit(raw: NominatimResult): GeocodeHit | null {
	const lat = Number(raw.lat);
	const lng = Number(raw.lon);
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
	const countryCode = String(raw.address?.country_code || '')
		.trim()
		.toUpperCase();
	const countryName = String(raw.address?.country || '').trim();
	const displayName = String(raw.display_name || '').trim();
	const placeName = pickPlaceName(raw);
	if (!placeName || !displayName) return null;
	return {
		displayName,
		placeName,
		lat,
		lng,
		countryCode,
		countryName,
	};
}

/** Search OpenStreetMap Nominatim for places. Call from the Worker (not the browser) to satisfy usage policy. */
export async function searchPlaces(
	query: string,
	opts: { limit?: number; signal?: AbortSignal } = {},
): Promise<GeocodeHit[] | { error: string }> {
	const q = query.trim();
	if (q.length < 2) return { error: 'Enter at least 2 characters to search.' };

	const limit = Math.min(8, Math.max(1, opts.limit ?? 5));
	const url = new URL(NOMINATIM_SEARCH);
	url.searchParams.set('q', q);
	url.searchParams.set('format', 'jsonv2');
	url.searchParams.set('addressdetails', '1');
	url.searchParams.set('limit', String(limit));

	let res: Response;
	try {
		res = await fetch(url.toString(), {
			headers: {
				Accept: 'application/json',
				'User-Agent': 'WebPageTomi/1.0 (personal travel admin; geocode)',
			},
			signal: opts.signal,
		});
	} catch {
		return { error: 'Place search failed. Try again.' };
	}

	if (!res.ok) {
		return { error: `Place search failed (${res.status}).` };
	}

	let data: unknown;
	try {
		data = await res.json();
	} catch {
		return { error: 'Place search returned invalid JSON.' };
	}

	if (!Array.isArray(data)) return { error: 'Unexpected place search response.' };

	const hits: GeocodeHit[] = [];
	for (const row of data as NominatimResult[]) {
		const mapped = mapHit(row);
		if (mapped) hits.push(mapped);
	}
	return hits;
}
