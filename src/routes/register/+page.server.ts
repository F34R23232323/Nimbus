import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { createSession, setSessionCookie } from '$lib/server/auth';
import { hashPassword } from '$lib/server/crypto';
import { rateLimit, clientIp } from '$lib/server/ratelimit';
import { getSettings } from '$lib/server/settings';
import { logAudit } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) throw redirect(303, '/dashboard');
	const settings = getSettings();
	if (!settings.registrationEnabled) {
		return { registrationEnabled: false };
	}
	return { registrationEnabled: true };
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const settings = getSettings();
		if (!settings.registrationEnabled) {
			return fail(403, { error: 'Registration is currently closed.' });
		}

		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();
		const email = String(form.get('email') ?? '').trim();
		const password = String(form.get('password') ?? '');
		const confirm = String(form.get('confirm') ?? '');

		const ip = clientIp(request);
		if (!rateLimit(`register:${ip}`, 6, 10 * 60_000)) {
			return fail(429, { error: 'Too many sign-up attempts. Please wait a while.', username, email });
		}

		if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
			return fail(400, { error: 'Username must be 3–24 characters: letters, numbers or underscores.', username, email });
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { error: 'Enter a valid email address.', username, email });
		}
		if (password.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters.', username, email });
		}
		if (password !== confirm) {
			return fail(400, { error: 'Passwords do not match.', username, email });
		}

		const existing = db
			.prepare('SELECT id FROM users WHERE email = ? OR username = ?')
			.get(email, username) as { id: number } | undefined;
		if (existing) {
			return fail(409, { error: 'An account with that email or username already exists.', username, email });
		}

		const status = settings.requireApproval ? 'pending' : 'active';
		const info = db
			.prepare(
				`INSERT INTO users (email, username, password_hash, role, status, storage_quota, created_at)
				 VALUES (?, ?, ?, 'user', ?, ?, ?)`
			)
			.run(email, username, hashPassword(password), status, settings.defaultQuota, Date.now());

		const userId = Number(info.lastInsertRowid);
		const session = createSession(userId, ip, request.headers.get('user-agent'));
		setSessionCookie(cookies, session);
		logAudit(userId, 'auth.register', { status }, ip);
		throw redirect(303, '/dashboard');
	}
};
