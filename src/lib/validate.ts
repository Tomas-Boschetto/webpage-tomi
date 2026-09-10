export function emptyToNull(value?: string | null): string | null {
	if (!value || !value.trim()) return null;
	return value.trim();
}

export function isSafeHttpUrl(value: string): boolean {
	try {
		const parsed = new URL(value);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:';
	} catch {
		return false;
	}
}

/** Absolute http(s) URLs or site-relative /media/… keys for stop photos. */
export function isSafeImageUrl(value: string): boolean {
	const trimmed = value.trim();
	if (trimmed.startsWith('/media/')) {
		return /^\/media\/[a-zA-Z0-9._\-\/]+$/.test(trimmed) && !trimmed.includes('..');
	}
	return isSafeHttpUrl(trimmed);
}

export function parseOptionalRating(
	rating: unknown,
): { value: number | null } | { error: string } {
	if (rating == null || rating === '') {
		return { value: null };
	}
	const num = typeof rating === 'number' ? rating : Number(rating);
	if (!Number.isFinite(num) || num < 0 || num > 5) {
		return { error: 'rating must be a number between 0 and 5' };
	}
	return { value: Math.round(num * 10) / 10 };
}
