import { redirect } from '@sveltejs/kit';
import { clearSessionCookie, SESSION_COOKIE, destroySession } from '$lib/server/auth';
import type { RequestHandler } from './$types';

function logout(cookies: import('@sveltejs/kit').Cookies) {
	const token = cookies.get(SESSION_COOKIE);
	if (token) destroySession(token);
	clearSessionCookie(cookies);
}

export const POST: RequestHandler = async ({ cookies }) => {
	logout(cookies);
	throw redirect(303, '/');
};

export const GET: RequestHandler = async ({ cookies }) => {
	logout(cookies);
	throw redirect(303, '/');
};
