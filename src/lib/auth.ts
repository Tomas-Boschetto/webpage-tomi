export interface AuthEnv {
	ADMIN_DEV_BYPASS?: string;
}

/**
 * Production: Cloudflare Access should gate /admin* and /api/admin*.
 * We still require the Access identity header so the API is not open if Access is misconfigured.
 * Local: set ADMIN_DEV_BYPASS=true in .dev.vars
 */
export function isAdminAuthorized(request: Request, env: AuthEnv): boolean {
	if (env.ADMIN_DEV_BYPASS === 'true') {
		return true;
	}

	const email = request.headers.get('Cf-Access-Authenticated-User-Email');
	return Boolean(email && email.includes('@'));
}

export function unauthorizedResponse(): Response {
	return Response.json(
		{ error: 'Unauthorized. Sign in via Cloudflare Access, or enable ADMIN_DEV_BYPASS locally.' },
		{ status: 401 },
	);
}
