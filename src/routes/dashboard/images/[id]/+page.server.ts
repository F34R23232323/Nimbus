import { error, fail, redirect } from '@sveltejs/kit';
import QRCode from 'qrcode';
import { db } from '$lib/server/db';
import { canManage, deleteFile, getFile, getFileDetail, replaceTags } from '$lib/server/files';
import { createShare, deleteShare, getShareById, sharesForFile, shareUrl } from '$lib/server/shares';
import { listCollections } from '$lib/server/collections';
import { siteUrl } from '$lib/server/settings';
import { fileAbsoluteUrl } from '$lib/server/urls';
import { secureFilename } from '$lib/server/crypto';
import { normalizeVisibility, visibilityFlags } from '$lib/visibility';
import { logAudit } from '$lib/server/audit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user) throw redirect(303, '/login?next=/dashboard/images');
	const user = locals.user;
	const file = await getFileDetail(params.id);
	if (!file || file.deleted_at) throw error(404, 'File not found.');
	if (!canManage(file, user)) throw error(403, 'You cannot manage this file.');

	const shares = sharesForFile(file.id).map(({ password_hash, ...share }) => ({
		...share,
		has_password: !!password_hash
	}));
	const latest = shares[0];
	let qr: string | null = null;
	if (latest) {
		try {
			qr = await QRCode.toDataURL(shareUrl(latest.slug, url.origin), {
				margin: 1,
				width: 320,
				color: { dark: '#0f172a', light: '#ffffff' }
			});
		} catch {
			qr = null;
		}
	}

	return {
		file,
		shares,
		qr,
		collections: listCollections(user.id),
		tagsInput: (file.tags ?? []).map((tag) => tag.name).join(', '),
		base: siteUrl(url.origin),
		directUrl: fileAbsoluteUrl(file, url.origin)
	};
};

export const actions: Actions = {
	update: async ({ params, locals, request }) => {
		const user = locals.user!;
		const file = await getFile(params.id);
		if (!file || file.deleted_at) return fail(404, { error: 'File not found.' });
		if (!canManage(file, user)) return fail(403, { error: 'Not allowed.' });
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const visibility = normalizeVisibility(form.get('visibility')) ?? 'private';
		const flags = visibilityFlags(visibility);
		const tags = String(form.get('tags') ?? '');
		if (name) {
			db.prepare(
				'UPDATE files SET original_name = ?, is_public = ?, listed = ? WHERE id = ?'
			).run(secureFilename(name).slice(0, 180), flags.isPublic, flags.listed, file.id);
		} else {
			db.prepare('UPDATE files SET is_public = ?, listed = ? WHERE id = ?').run(
				flags.isPublic,
				flags.listed,
				file.id
			);
		}
		await replaceTags(file.id, tags, user.id);
		logAudit(user.id, 'file.update', { id: file.id });
		return { success: 'Changes saved.' };
	},

	addToCollection: async ({ params, locals, request }) => {
		const user = locals.user!;
		const file = await getFile(params.id);
		if (!file || !canManage(file, user)) return fail(403, { error: 'Not allowed.' });
		const collectionId = String((await request.formData()).get('collectionId') ?? '');
		if (!collectionId) return fail(400, { error: 'Choose a collection.' });
		const collection = db
			.prepare('SELECT id FROM collections WHERE id = ? AND user_id = ?')
			.get(collectionId, user.id);
		if (!collection) return fail(404, { error: 'Collection not found.' });
		const { addFile } = await import('$lib/server/collections');
		addFile(collectionId, file.id, user.id);
		return { success: 'Added to collection.' };
	},

	createShare: async ({ params, locals, request, url }) => {
		const user = locals.user!;
		const file = await getFile(params.id);
		if (!file || !canManage(file, user)) return fail(403, { error: 'Not allowed.' });
		const form = await request.formData();
		const password = String(form.get('password') ?? '').trim();
		const expiresRaw = String(form.get('expiresInHours') ?? '0');
		const expiresInHours = Number(expiresRaw) || null;
		const maxViews = Number(String(form.get('maxViews') ?? '0')) || null;

		const share = createShare(file, user, { password: password || null, expiresInHours, maxViews });
		logAudit(user.id, 'share.create', { file: file.id, slug: share.slug });
		return {
			success: 'Share link created.',
			created: shareUrl(share.slug, url.origin),
			slug: share.slug
		};
	},

	revokeShare: async ({ request, locals }) => {
		const user = locals.user!;
		const id = String((await request.formData()).get('shareId') ?? '');
		const share = getShareById(id);
		if (!share) return fail(404, { error: 'Share not found.' });
		deleteShare(id, user);
		return { success: 'Share link revoked.' };
	},

	delete: async ({ params, locals }) => {
		const user = locals.user!;
		const file = await getFile(params.id);
		if (!file) return fail(404, { error: 'File not found.' });
		await deleteFile(file, user);
		logAudit(user.id, 'file.delete', { id: file.id });
		throw redirect(303, '/dashboard/images');
	}
};
