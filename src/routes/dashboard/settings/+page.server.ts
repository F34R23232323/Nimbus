import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { clearSessionCookie, destroySession, listApiKeys } from '$lib/server/auth';
import { generateApiKey, hashPassword, randomId, verifyPassword } from '$lib/server/crypto';
import { userStats } from '$lib/server/files';
import { listCollections } from '$lib/server/collections';
import { getSettings, siteUrl } from '$lib/server/settings';
import { logAudit } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) throw redirect(303, '/login?next=/dashboard/settings');
	const sessions = db
		.prepare(
			'SELECT id, created_at, expires_at, ip, user_agent FROM sessions WHERE user_id = ? ORDER BY created_at DESC'
		)
		.all(user.id) as {
		id: string;
		created_at: number;
		expires_at: number;
		ip: string | null;
		user_agent: string | null;
	}[];

	const settings = getSettings();
	return {
		user,
		sessions,
		currentSessionId: locals.sessionId,
		apiKeys: listApiKeys(user.id),
		collections: listCollections(user.id),
		stats: userStats(user.id),
		quota: user.storage_quota || settings.defaultQuota,
		base: siteUrl(url.origin),
		origin: url.origin
	};
};

export const actions: Actions = {
	profile: async ({ request, locals }) => {
		const user = locals.user!;
		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();
		const email = String(form.get('email') ?? '').trim();
		const bio = String(form.get('bio') ?? '').slice(0, 300);
		const avatar = String(form.get('avatarFileId') ?? '').trim();

		if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
			return fail(400, { profileError: 'Username must be 3–24 letters, numbers or underscores.' });
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, { profileError: 'Enter a valid email address.' });
		}
		const clash = db
			.prepare('SELECT id FROM users WHERE (email = ? OR username = ?) AND id != ?')
			.get(email, username, user.id);
		if (clash) return fail(409, { profileError: 'That email or username is already in use.' });

		let avatarId: string | null = user.avatar_file_id;
		if (avatar === 'none') avatarId = null;
		else if (avatar) {
			const file = db
				.prepare("SELECT id FROM files WHERE id = ? AND user_id = ? AND mime LIKE 'image/%'")
				.get(avatar, user.id) as { id: string } | undefined;
			if (!file) return fail(400, { profileError: 'Avatar file not found.' });
			avatarId = file.id;
		}

		db.prepare('UPDATE users SET username = ?, email = ?, bio = ?, avatar_file_id = ? WHERE id = ?').run(
			username,
			email,
			bio,
			avatarId,
			user.id
		);
		logAudit(user.id, 'user.profile.update');
		return { profileSuccess: 'Profile updated.' };
	},

	password: async ({ request, locals, cookies }) => {
		const user = locals.user!;
		const form = await request.formData();
		const current = String(form.get('current') ?? '');
		const next = String(form.get('next') ?? '');
		const confirm = String(form.get('confirm') ?? '');

		const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id) as {
			password_hash: string;
		};
		if (!verifyPassword(current, row.password_hash)) {
			return fail(400, { passwordError: 'Your current password is incorrect.' });
		}
		if (next.length < 8) return fail(400, { passwordError: 'New password must be at least 8 characters.' });
		if (next !== confirm) return fail(400, { passwordError: 'New passwords do not match.' });

		db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(next), user.id);
		db.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?').run(user.id, locals.sessionId ?? '');
		logAudit(user.id, 'user.password.change');
		return { passwordSuccess: 'Password changed. Other sessions were signed out.' };
	},

	createKey: async ({ request, locals }) => {
		const user = locals.user!;
		const name = String((await request.formData()).get('name') ?? '').trim() || 'API key';
		const { key, prefix, hash } = generateApiKey();
		db.prepare(
			'INSERT INTO api_keys (id, user_id, name, prefix, key_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)'
		).run(randomId(10), user.id, name.slice(0, 60), prefix, hash, Date.now());
		return { newKey: key, keyName: name };
	},

	revokeKey: async ({ request, locals }) => {
		const id = String((await request.formData()).get('id') ?? '');
		db.prepare('DELETE FROM api_keys WHERE id = ? AND user_id = ?').run(id, locals.user!.id);
		return { securitySuccess: 'API key revoked.' };
	},

	revokeSession: async ({ request, locals, cookies }) => {
		const id = String((await request.formData()).get('id') ?? '');
		const session = db.prepare('SELECT user_id FROM sessions WHERE id = ?').get(id) as
			| { user_id: number }
			| undefined;
		if (!session || session.user_id !== locals.user!.id) return fail(404, { securityError: 'Session not found.' });
		destroySession(id);
		if (id === locals.sessionId) {
			clearSessionCookie(cookies);
			throw redirect(303, '/login');
		}
		return { securitySuccess: 'Session signed out.' };
	},

	revokeOtherSessions: async ({ locals }) => {
		db.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?').run(
			locals.user!.id,
			locals.sessionId ?? ''
		);
		return { securitySuccess: 'All other sessions signed out.' };
	},

	deleteAccount: async ({ request, locals, cookies }) => {
		const user = locals.user!;
		const password = String((await request.formData()).get('password') ?? '');
		const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id) as {
			password_hash: string;
		};
		if (!verifyPassword(password, row.password_hash)) {
			return fail(400, { deleteError: 'Password is incorrect.' });
		}
		const owned = db
			.prepare('SELECT path, thumb_path FROM files WHERE user_id = ?')
			.all(user.id) as { path: string; thumb_path: string | null }[];
		db.prepare('DELETE FROM files WHERE user_id = ?').run(user.id);
		db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
		const { removeStored } = await import('$lib/server/storage');
		for (const item of owned) {
			await removeStored(item.path);
			await removeStored(item.thumb_path);
		}
		clearSessionCookie(cookies);
		throw redirect(303, '/');
	}
};
