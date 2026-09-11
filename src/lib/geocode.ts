export type GeocodeHit = {
	displayName: string;
	placeName: string;
	lat: number;
	lng: number;
	countryCode: string;
	countryName: string;
	source?: 'google' | 'nominatim';
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

type GoogleAddressComponent = {
	longText?: string;
	shortText?: string;
	types?: string[];
};

type GooglePlace = {
	displayName?: { text?: string };
	formattedAddress?: string;
	shortFormattedAddress?: string;
	location?: { latitude?: number; longitude?: number };
	addressComponents?: GoogleAddressComponent[];
};

const NOMINATIM_SEARCH = 'https://nominatim.openstreetmap.org/search';
const GOOGLE_SEARCH_TEXT = 'https://places.googleapis.com/v1/places:searchText';

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

function mapNominatimHit(raw: NominatimResult): GeocodeHit | null {
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
		source: 'nominatim',
	};
}

function componentByType(components: GoogleAddressComponent[] | undefined, type: string) {
	return components?.find((c) => c.types?.includes(type));
}

function mapGooglePlace(place: GooglePlace): GeocodeHit | null {
	const lat = Number(place.location?.latitude);
	const lng = Number(place.location?.longitude);
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
	const placeName = String(place.displayName?.text || '').trim();
	const displayName = String(
		place.formattedAddress || place.shortFormattedAddress || placeName,
	).trim();
	if (!placeName || !displayName) return null;
	const country = componentByType(place.addressComponents, 'country');
	return {
		displayName,
		placeName,
		lat,
		lng,
		countryCode: String(country?.shortText || '')
			.trim()
			.toUpperCase(),
		countryName: String(country?.longText || '').trim(),
		source: 'google',
	};
}

async function searchNominatim(
	query: string,
	opts: { limit: number; signal?: AbortSignal },
): Promise<GeocodeHit[] | { error: string }> {
	const url = new URL(NOMINATIM_SEARCH);
	url.searchParams.set('q', query);
	url.searchParams.set('format', 'jsonv2');
	url.searchParams.set('addressdetails', '1');
	url.searchParams.set('limit', String(opts.limit));

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

	if (!res.ok) return { error: `Place search failed (${res.status}).` };

	let data: unknown;
	try {
		data = await res.json();
	} catch {
		return { error: 'Place search returned invalid JSON.' };
	}
	if (!Array.isArray(data)) return { error: 'Unexpected place search response.' };

	const hits: GeocodeHit[] = [];
	for (const row of data as NominatimResult[]) {
		const mapped = mapNominatimHit(row);
		if (mapped) hits.push(mapped);
	}
	return hits;
}

async function searchGooglePlaces(
	query: string,
	apiKey: string,
	opts: { limit: number; signal?: AbortSignal },
): Promise<GeocodeHit[] | { error: string }> {
	let res: Response;
	try {
		res = await fetch(GOOGLE_SEARCH_TEXT, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Goog-Api-Key': apiKey,
				'X-Goog-FieldMask':
					'places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.addressComponents',
			},
			body: JSON.stringify({ textQuery: query, pageSize: opts.limit }),
			signal: opts.signal,
		});
	} catch {
		return { error: 'Google place search failed. Try again.' };
	}

	if (!res.ok) {
		let detail = '';
		try {
			const errJson = (await res.json()) as { error?: { message?: string } };
			detail = errJson.error?.message ? ` — ${errJson.error.message}` : '';
		} catch {
			/* ignore */
		}
		return { error: `Google place search failed (${res.status})${detail}.` };
	}

	let data: unknown;
	try {
		data = await res.json();
	} catch {
		return { error: 'Google place search returned invalid JSON.' };
	}

	const places = (data as { places?: GooglePlace[] }).places;
	if (!Array.isArray(places)) return [];

	const hits: GeocodeHit[] = [];
	for (const place of places) {
		const mapped = mapGooglePlace(place);
		if (mapped) hits.push(mapped);
	}
	return hits;
}

/**
 * Search places for admin stop entry.
 * Prefers Google Places Text Search when `googleApiKey` is set; otherwise Nominatim.
 */
export async function searchPlaces(
	query: string,
	opts: { limit?: number; signal?: AbortSignal; googleApiKey?: string } = {},
): Promise<GeocodeHit[] | { error: string }> {
	const q = query.trim();
	if (q.length < 2) return { error: 'Enter at least 2 characters to search.' };

	const limit = Math.min(8, Math.max(1, opts.limit ?? 5));
	const key = opts.googleApiKey?.trim() || '';

	if (key) {
		return searchGooglePlaces(q, key, { limit, signal: opts.signal });
	}

	return searchNominatim(q, { limit, signal: opts.signal });
}
