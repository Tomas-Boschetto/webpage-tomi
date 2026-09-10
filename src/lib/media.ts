const MEDIA_PREFIX = '/media/';

export const MAX_STOP_IMAGE_BYTES = Math.floor(1.5 * 1024 * 1024);
export const ALLOWED_STOP_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function isMediaPath(url: string | null | undefined): boolean {
	return Boolean(url && url.startsWith(MEDIA_PREFIX));
}

export function mediaKeyFromUrl(url: string | null | undefined): string | null {
	if (!isMediaPath(url)) return null;
	const key = url!.slice(MEDIA_PREFIX.length).replace(/^\/+/, '');
	if (!key || key.includes('..')) return null;
	return key;
}

export function mediaUrlFromKey(key: string): string {
	return `${MEDIA_PREFIX}${key.replace(/^\/+/, '')}`;
}

export function extensionForType(type: string): string {
	if (type === 'image/png') return 'png';
	if (type === 'image/webp') return 'webp';
	return 'jpg';
}

export async function deleteMediaObject(
	bucket: R2Bucket | undefined,
	url: string | null | undefined,
): Promise<void> {
	const key = mediaKeyFromUrl(url);
	if (!bucket || !key) return;
	try {
		await bucket.delete(key);
	} catch {
		/* ignore missing objects */
	}
}

export function contentTypeFromKey(key: string): string {
	if (key.endsWith('.png')) return 'image/png';
	if (key.endsWith('.webp')) return 'image/webp';
	return 'image/jpeg';
}
