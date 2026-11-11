import { error, type Handle, type HandleServerError } from '@sveltejs/kit';
import { authenticateRequest } from '$lib/server/auth';
import { ensureStorage } from '$lib/server/storage';

const FORM_TYPES = /multipart\/form-data|application\/x-www-form-urlencoded|text\/plain/i;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

let storageReady: Promise<void> | null = null;

export const handle: Handle = async ({ event, resolve }) => {
	storageReady ??= ensureStorage();
	await storageReady;

	// Cross-site form submissions are rejected, but requests authenticated with
	// an API key or the bot secret may omit the Origin header (scripts, ShareX).
	const method = event.request.method.toUpperCase();
	if (!SAFE_METHODS.has(method) && FORM_TYPES.test(event.request.headers.get('content-type') ?? '')) {
		const programmatic = event.request.headers.has('authorization') || event.request.headers.has('x-bot-secret');
		const origin = event.request.headers.get('origin');
		if (!programmatic && origin && origin !== event.url.origin) {
			throw error(403, 'Cross-site form submissions are not allowed.');
		}
	}

	const auth = authenticateRequest(event.cookies, event.request);
	event.locals.user = auth.user;
	event.locals.sessionId = auth.sessionId;
	event.locals.authenticatedVia = auth.via;
	event.locals.theme = event.cookies.get('nimbus_theme') === 'light' ? 'light' : 'dark';

	const response = await resolve(event);

	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'SAMEORIGIN');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

	return response;
};

export const handleError: HandleServerError = ({ error, event, status }) => {
	if (status >= 500) {
		console.error(`[nimbus] ${event.request.method} ${event.url.pathname}`, error);
	}
	return {
		message: status >= 500 ? 'Something went wrong on our side. Please try again.' : 'Request failed.',
		code: String(status)
	};
};
