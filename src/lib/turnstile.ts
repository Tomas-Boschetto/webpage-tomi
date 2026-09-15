export type TurnstileVerifyResult = {
	success: boolean;
	action?: string;
	hostname?: string;
	['error-codes']?: string[];
};

export async function verifyTurnstile(
	token: string,
	secret: string,
	ip?: string,
): Promise<TurnstileVerifyResult> {
	const body = new URLSearchParams();
	body.set('secret', secret);
	body.set('response', token);
	if (ip) body.set('remoteip', ip);

	const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		signal: AbortSignal.timeout(10_000),
		body,
	});

	if (!res.ok) {
		throw new Error(`siteverify ${res.status}`);
	}

	return (await res.json()) as TurnstileVerifyResult;
}

export function parseTurnstileHostnames(raw: string | undefined): Set<string> {
	return new Set(
		(raw ?? '')
			.split(',')
			.map((hostname) => hostname.trim())
			.filter(Boolean),
	);
}
