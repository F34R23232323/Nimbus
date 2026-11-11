import { error, fail, redirect } from '@sveltejs/kit';
import QRCode from 'qrcode';
import { getFileDetail } from '$lib/server/files';
import {
	checkSharePassword,
	getShareBySlug,
	grantShareAccess,
	grantShareView,
	hasShareAccess,
	isExpired,
	shareUrl
} from '$lib/server/shares';
import { siteUrl } from '$lib/server/settings';
import { clientIp, rateLimit } from '$lib/server/ratelimit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies, url }) => {
	const share = getShareBySlug(params.slug);
	if (!share) throw error(404, 'This share link does not exist.');

	const file = await getFileDetail(share.file_id);
	if (!file || file.deleted_at) {
		return { state: 'missing' as const, share: null, file: null, qr: null, url: null, cdn: null };
	}

	if (isExpired(share)) {
		return { state: 'expired' as const, share: null, file: null, qr: null, url: null, cdn: null };
	}

	const safeShare = { ...share, password_hash: null };
	if (share.password_hash && !hasShareAccess(cookies, share)) {
		return { state: 'locked' as const, share: safeShare, file: null, qr: null, url: null, cdn: null };
	}

	grantShareView(share);

	const link = shareUrl(share.slug, url.origin);
	let qr: string | null = null;
	try {
		qr = await QRCode.toDataURL(link, {
			margin: 1,
			width: 360,
			color: { dark: '#0f172a', light: '#ffffff' }
		});
	} catch {
		qr = null;
	}

	return {
		state: 'ok' as const,
		share: { ...safeShare, views: share.views + 1 },
		file,
		qr,
		url: link,
		cdn: `${siteUrl(url.origin)}/s/${share.slug}/raw`
	};
};

export const actions: Actions = {
	default: async ({ params, request, cookies }) => {
		const share = getShareBySlug(params.slug);
		if (!share) return fail(404, { error: 'Share not found.' });
		if (isExpired(share)) return fail(410, { error: 'This share has expired.' });
		if (!rateLimit(`share:${share.slug}:${clientIp(request)}`, 10, 60_000)) {
			return fail(429, { error: 'Too many attempts. Wait a minute and try again.' });
		}
		const password = String((await request.formData()).get('password') ?? '');
		if (!checkSharePassword(share, password)) {
			return fail(401, { error: 'Incorrect password.' });
		}
		grantShareAccess(cookies, share.slug);
		throw redirect(303, `/s/${share.slug}`);
	}
};
