const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 5;

export async function checkContactRateLimit(
	db: D1Database,
	ip: string,
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
	const now = Date.now();
	const row = await db
		.prepare(`SELECT count, window_start FROM contact_rate WHERE ip = ?`)
		.bind(ip)
		.first<{ count: number; window_start: number }>();

	if (!row || now - row.window_start > WINDOW_MS) {
		await db
			.prepare(
				`INSERT INTO contact_rate (ip, count, window_start) VALUES (?, 1, ?)
				 ON CONFLICT(ip) DO UPDATE SET count = 1, window_start = excluded.window_start`,
			)
			.bind(ip, now)
			.run();
		return { allowed: true };
	}

	if (row.count >= MAX_REQUESTS) {
		const retryAfterSec = Math.ceil((row.window_start + WINDOW_MS - now) / 1000);
		return { allowed: false, retryAfterSec };
	}

	await db
		.prepare(`UPDATE contact_rate SET count = count + 1 WHERE ip = ?`)
		.bind(ip)
		.run();

	return { allowed: true };
}

export function clientIp(request: Request): string {
	return (
		request.headers.get('CF-Connecting-IP') ||
		request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
		'unknown'
	);
}
