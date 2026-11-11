import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { getSettings, updateSettings, DEFAULT_SETTINGS } from '$lib/server/settings';
import { hashPassword, randomId, randomToken } from '$lib/server/crypto';
import { siteStats, deleteFile } from '$lib/server/files';
import { recentAudit, logAudit } from '$lib/server/audit';
import { removeStored } from '$lib/server/storage';
import { listCollections } from '$lib/server/collections';
import { normalizeVisibility } from '$lib/visibility';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(303, '/login?next=/dashboard/admin');
	if (locals.user.role !== 'admin') throw error(403, 'Administrator access required.');

	const users = db
		.prepare(
			`SELECT u.id, u.email, u.username, u.role, u.status, u.bio, u.avatar_file_id, u.storage_quota, u.created_at,
				(SELECT COALESCE(SUM(size), 0) FROM files f WHERE f.user_id = u.id AND f.deleted_at IS NULL) AS storage_used,
				(SELECT COUNT(*) FROM files f WHERE f.user_id = u.id AND f.deleted_at IS NULL) AS file_count
			 FROM users u ORDER BY u.created_at DESC`
		)
		.all() as {
		id: number;
		email: string;
		username: string;
		role: string;
		status: string;
		bio: string;
		avatar_file_id: string | null;
		storage_quota: number;
		created_at: number;
		storage_used: number;
		file_count: number;
	}[];

	const reports = db
		.prepare(
			`SELECT r.*, f.original_name, f.id AS file_id2, u.username AS reporter
			 FROM reports r JOIN files f ON f.id = r.file_id LEFT JOIN users u ON u.id = r.reporter_id
			 ORDER BY r.created_at DESC LIMIT 40`
		)
		.all() as {
		id: number;
		file_id: string;
		reason: string;
		status: string;
		created_at: number;
		original_name: string;
		reporter: string | null;
	}[];

	const settings = getSettings();
	const tab = ['users', 'settings', 'moderation', 'integrations'].includes(url.searchParams.get('tab') ?? '')
		? (url.searchParams.get('tab') as string)
		: 'users';
	const botOwnerId =
		settings.botOwnerId ??
		users.find((user) => user.role === 'admin' && user.status === 'active')?.id ??
		null;
	const botCollections = botOwnerId ? listCollections(botOwnerId) : [];

	return {
		tab,
		users,
		reports: reports.map((report) => ({ ...report, file_id: report.file_id })),
		botCollections,
		stats: siteStats(),
		settings: {
			...settings,
			discordToken: settings.discordToken,
			botSecret: settings.botSecret
		},
		audit: recentAudit(30),
		currentUserId: locals.user.id
	};
};

function megabytes(value: FormDataEntryValue | null): number {
	const number = Number(value);
	return Number.isFinite(number) && number > 0 ? Math.round(number * 1024 * 1024) : 0;
}

export const actions: Actions = {
	updateUser: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Admins only.' });
		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!id) return fail(400, { error: 'Missing user.' });

		const target = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as
			| { id: number; role: string; status: string }
			| undefined;
		if (!target) return fail(404, { error: 'User not found.' });

		const role = String(form.get('role') ?? target.role);
		const status = String(form.get('status') ?? target.status);
		const quota = megabytes(form.get('quotaMb'));

		if (target.id === locals.user.id && role !== 'admin') {
			return fail(400, { error: 'You cannot remove your own admin role.' });
		}
		if (target.id === locals.user.id && status !== 'active') {
			return fail(400, { error: 'You cannot suspend your own account.' });
		}
		if (!['admin', 'user'].includes(role)) return fail(400, { error: 'Invalid role.' });
		if (!['active', 'pending', 'banned'].includes(status)) return fail(400, { error: 'Invalid status.' });

		db.prepare('UPDATE users SET role = ?, status = ?, storage_quota = ? WHERE id = ?').run(
			role,
			status,
			quota,
			id
		);
		logAudit(locals.user.id, 'admin.user.update', { id, role, status, quota });
		return { success: 'User updated.' };
	},

	deleteUser: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Admins only.' });
		const id = Number((await request.formData()).get('id'));
		if (id === locals.user.id) return fail(400, { error: 'You cannot delete your own account here.' });
		const files = db.prepare('SELECT path, thumb_path FROM files WHERE user_id = ?').all(id) as {
			path: string;
			thumb_path: string | null;
		}[];
		db.prepare('DELETE FROM files WHERE user_id = ?').run(id);
		db.prepare('DELETE FROM users WHERE id = ?').run(id);
		for (const file of files) {
			await removeStored(file.path);
			await removeStored(file.thumb_path);
		}
		logAudit(locals.user.id, 'admin.user.delete', { id });
		return { success: 'User and their files were deleted.' };
	},

	resetPassword: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Admins only.' });
		const id = Number((await request.formData()).get('id'));
		const target = db.prepare('SELECT username FROM users WHERE id = ?').get(id) as
			| { username: string }
			| undefined;
		if (!target) return fail(404, { error: 'User not found.' });
		const password = `nimbus-${randomId(10)}`;
		db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), id);
		db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
		logAudit(locals.user.id, 'admin.user.reset_password', { id });
		return { tempPassword: password, tempUser: target.username };
	},

	saveSettings: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Admins only.' });
		const form = await request.formData();
		const get = (key: string) => String(form.get(key) ?? '');

		const allowedExtensions = get('allowedExtensions')
			.split(',')
			.map((ext) => ext.trim().replace(/^\./, '').toLowerCase())
			.filter((ext) => /^[a-z0-9]{1,8}$/.test(ext))
			.slice(0, 40);

		const accent = /^#[0-9a-fA-F]{6}$/.test(get('accent')) ? get('accent') : DEFAULT_SETTINGS.accent;
		const defaultVisibility = normalizeVisibility(get('defaultVisibility')) ?? 'private';
		const discordGuildInstall = form.get('discordGuildInstall') === '1';
		const discordUserInstall = form.get('discordUserInstall') === '1';
		if (!discordGuildInstall && !discordUserInstall) {
			return fail(400, { error: 'Enable at least one Discord install type (server or user).' });
		}

		const firstAdmin = db
			.prepare("SELECT id FROM users WHERE role = 'admin' AND status = 'active' ORDER BY id LIMIT 1")
			.get() as { id: number } | undefined;
		const selectedBotOwnerId = Number(form.get('botOwnerId')) || firstAdmin?.id || null;
		const selectedCollectionId = get('discordCollectionId').trim().slice(0, 40);
		if (selectedCollectionId) {
			const owned = selectedBotOwnerId
				? db
						.prepare('SELECT 1 FROM collections WHERE id = ? AND user_id = ?')
						.get(selectedCollectionId, selectedBotOwnerId)
				: undefined;
			if (!owned) {
				return fail(400, {
					error: 'The selected uploads collection does not belong to the bot uploads owner.'
				});
			}
		}

		updateSettings({
			siteName: get('siteName').slice(0, 60) || DEFAULT_SETTINGS.siteName,
			siteDescription: get('siteDescription').slice(0, 240) || DEFAULT_SETTINGS.siteDescription,
			accent,
			publicUrl: get('publicUrl').replace(/\/+$/, ''),
			registrationEnabled: form.get('registrationEnabled') === '1',
			requireApproval: form.get('requireApproval') === '1',
			commentsEnabled: form.get('commentsEnabled') === '1',
			compressByDefault: form.get('compressByDefault') === '1',
			stripExif: form.get('stripExif') === '1',
			directFileLinks: form.get('directFileLinks') === '1',
			maintenance: form.get('maintenance') === '1',
			maxUploadSize: megabytes(form.get('maxUploadMb')) || DEFAULT_SETTINGS.maxUploadSize,
			defaultQuota: megabytes(form.get('defaultQuotaMb')),
			defaultVisibility,
			allowedExtensions: allowedExtensions.length ? allowedExtensions : DEFAULT_SETTINGS.allowedExtensions,
			discordToken: get('discordToken').trim(),
			discordClientId: get('discordClientId').trim(),
			discordGuildId: get('discordGuildId').trim(),
			discordChannelId: get('discordChannelId').trim(),
			discordAnnounce: form.get('discordAnnounce') === '1',
			discordGuildInstall,
			discordUserInstall,
			discordCollectionId: selectedCollectionId,
			botOwnerId: selectedBotOwnerId
		});
		logAudit(locals.user.id, 'admin.settings.update');
		return { success: 'Instance settings saved.' };
	},

	regenerateBotSecret: async ({ locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Admins only.' });
		const secret = randomToken(32);
		updateSettings({ botSecret: secret });
		return { success: 'Bot secret regenerated. Update the bot environment.', newSecret: secret };
	},

	moderateFile: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Admins only.' });
		const form = await request.formData();
		const fileId = String(form.get('fileId') ?? '');
		const action = String(form.get('action') ?? '');
		const file = db.prepare('SELECT * FROM files WHERE id = ?').get(fileId) as
			| import('$lib/types').FileRecord
			| undefined;
		if (!file) return fail(404, { error: 'File not found.' });

		if (action === 'hide') {
			db.prepare('UPDATE files SET is_public = 0, listed = 0 WHERE id = ?').run(fileId);
			db.prepare("UPDATE reports SET status = 'resolved' WHERE file_id = ?").run(fileId);
			logAudit(locals.user.id, 'admin.file.hide', { fileId });
			return { success: 'File hidden from public view.' };
		}
		if (action === 'show') {
			db.prepare('UPDATE files SET is_public = 1, listed = 1 WHERE id = ?').run(fileId);
			logAudit(locals.user.id, 'admin.file.show', { fileId });
			return { success: 'File is public again.' };
		}
		if (action === 'delete') {
			await deleteFile(file, locals.user);
			db.prepare('DELETE FROM reports WHERE file_id = ?').run(fileId);
			logAudit(locals.user.id, 'admin.file.delete', { fileId });
			return { success: 'File deleted.' };
		}
		return fail(400, { error: 'Unknown moderation action.' });
	},

	resolveReport: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Admins only.' });
		const form = await request.formData();
		const id = Number(form.get('id'));
		const status = String(form.get('status') ?? 'resolved');
		db.prepare('UPDATE reports SET status = ? WHERE id = ?').run(
			['open', 'resolved', 'dismissed'].includes(status) ? status : 'resolved',
			id
		);
		return { success: 'Report updated.' };
	}
};
