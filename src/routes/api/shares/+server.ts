import { error, json } from '@sveltejs/kit';
import { httpErrorDetails } from '$lib/server/httpError';
import { requireUser } from '$lib/server/auth';
import { canManage, getFile } from '$lib/server/files';
import { createShare, shareUrl } from '$lib/server/shares';
import { siteUrl } from '$lib/server/settings';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, url }) => {
	try {
		const user = requireUser(locals.user);
		const body = (await request.json().catch(() => ({}))) as {
			fileId?: string;
			password?: string;
			expiresInHours?: number;
			maxViews?: number;
		};
		if (!body.fileId) throw error(400, 'fileId is required.');
		const file = await getFile(body.fileId);
		if (!file || file.deleted_at) throw error(404, 'File not found.');
		if (!canManage(file, user)) throw error(403, 'You cannot share this file.');

		const share = createShare(file, user, {
			password: body.password || null,
			expiresInHours: Number(body.expiresInHours) || null,
			maxViews: Number(body.maxViews) || null
		});

		const base = siteUrl(url.origin);
		const { password_hash, ...safeShare } = share;
		return json({
			ok: true,
			share: { ...safeShare, has_password: !!password_hash },
			url: shareUrl(share.slug, url.origin),
			base,
			path: `/s/${share.slug}`
		});
	} catch (err) {
		const httpError = httpErrorDetails(err);
		if (httpError) return json({ ok: false, error: httpError.message }, { status: httpError.status });
		console.error('[nimbus] share api error', err);
		return json({ ok: false, error: 'Could not create share.' }, { status: 500 });
	}
};
