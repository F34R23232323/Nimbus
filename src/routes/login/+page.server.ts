import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { createSession, getUserRowByEmail, setSessionCookie } from '$lib/server/auth';
import { verifyPassword } from '$lib/server/crypto';
import { rateLimit, clientIp } from '$lib/server/ratelimit';
import { getSettings } from '$lib/server/settings';
import { logAudit } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

function safeNext(next: FormDataEntryValue | null): string {
	const value = typeof next === 'string' ? next : '';
	return value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) throw redirect(303, '/dashboard');
	return {
		next: url.searchParams.get('next') ?? '',
		registrationEnabled: getSettings().registrationEnabled
	};
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const next = safeNext(form.get('next'));

		const ip = clientIp(request) ?? 'unknown';
		if (!rateLimit(`login:${ip}`, 12, 60_000)) {
			return fail(429, { error: 'Too many attempts. Wait a minute and try again.', email });
		}

		if (!email || !password) return fail(400, { error: 'Email and password are required.', email });

		const row = getUserRowByEmail(email);
		if (!row || !verifyPassword(password, row.password_hash)) {
			return fail(400, { error: 'Invalid email or password.', email });
		}
		if (row.status === 'banned') {
			return fail(403, { error: 'This account has been suspended.', email });
		}

		const session = createSession(row.id, ip, request.headers.get('user-agent'));
		setSessionCookie(cookies, session);
		logAudit(row.id, 'auth.login', undefined, ip);
		locals.user = null;
		throw redirect(303, next);
	}
};
