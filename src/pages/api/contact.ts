import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { Resend } from 'resend';
import { checkContactRateLimit, clientIp } from '../../lib/rate-limit';
import { verifyTurnstile } from '../../lib/turnstile';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const data = body as Record<string, unknown>;
	const name = typeof data.name === 'string' ? data.name.trim() : '';
	const email = typeof data.email === 'string' ? data.email.trim() : '';
	const message = typeof data.message === 'string' ? data.message.trim() : '';
	const turnstileToken = typeof data.turnstileToken === 'string' ? data.turnstileToken : '';

	if (!name || name.length > 120) {
		return Response.json({ error: 'Name is required (max 120 chars).' }, { status: 400 });
	}
	if (!email || email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return Response.json({ error: 'A valid email is required.' }, { status: 400 });
	}
	if (!message || message.length > 4000) {
		return Response.json({ error: 'Message is required (max 4000 chars).' }, { status: 400 });
	}

	const ip = clientIp(request);
	const rate = await checkContactRateLimit(env.DB, ip);
	if (!rate.allowed) {
		return Response.json(
			{ error: 'Too many messages. Please try again later.' },
			{
				status: 429,
				headers: rate.retryAfterSec
					? { 'Retry-After': String(rate.retryAfterSec) }
					: undefined,
			},
		);
	}

	const secret = env.TURNSTILE_SECRET_KEY;
	if (secret) {
		if (!turnstileToken) {
			return Response.json({ error: 'Complete the bot check and try again.' }, { status: 400 });
		}
		const ok = await verifyTurnstile(turnstileToken, secret, ip === 'unknown' ? undefined : ip);
		if (!ok) {
			return Response.json({ error: 'Bot check failed. Please try again.' }, { status: 400 });
		}
	}

	const to = env.CONTACT_TO_EMAIL;
	const from = env.CONTACT_FROM_EMAIL || 'onboarding@resend.dev';
	const apiKey = env.RESEND_API_KEY;

	if (!apiKey || !to) {
		console.log('[contact] (dev) message received', { name, email, message });
		return Response.json({
			ok: true,
			dev: true,
			note: 'RESEND_API_KEY or CONTACT_TO_EMAIL not set — logged only.',
		});
	}

	const resend = new Resend(apiKey);
	const siteName = env.SITE_NAME || 'Tomas Boschetto';

	const { error } = await resend.emails.send({
		from: `${siteName} Contact <${from}>`,
		to: [to],
		replyTo: email,
		subject: `Contact form: ${name}`,
		text: `From: ${name} <${email}>\nIP: ${ip}\n\n${message}`,
	});

	if (error) {
		console.error('[contact] resend error', error);
		return Response.json({ error: 'Could not send message right now.' }, { status: 502 });
	}

	return Response.json({ ok: true });
};
