export async function verifyTurnstile(
	token: string,
	secret: string,
	ip?: string,
): Promise<boolean> {
	const body = new URLSearchParams();
	body.set('secret', secret);
	body.set('response', token);
	if (ip) body.set('remoteip', ip);

	const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body,
	});

	if (!res.ok) return false;
	const data = (await res.json()) as { success?: boolean };
	return Boolean(data.success);
}
