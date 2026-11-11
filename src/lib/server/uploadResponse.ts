import { getSettings, siteUrl } from './settings';
import { createShare, shareUrl } from './shares';
import { fileAbsoluteUrl, filePath } from './urls';
import type { FileWithMeta, SessionUser } from '$lib/types';

export function uploadPayload(
	file: FileWithMeta,
	origin: string,
	options: { share?: boolean; password?: string; expiresInHours?: number; user?: SessionUser | null } = {}
) {
	const direct = getSettings().directFileLinks;
	const base = siteUrl(origin);
	const path = filePath(file, direct);
	const absoluteUrl = fileAbsoluteUrl(file, origin, direct);
	const thumbUrl = file.thumb_path ? `/t/${file.id}` : null;
	// ShareX rejects an empty ThumbnailURL, so fall back to the full file.
	const absoluteThumbUrl = thumbUrl ? `${base}${thumbUrl}` : absoluteUrl;
	const markdown = `![${file.original_name}](${absoluteUrl})`;

	let shareLink: string | null = null;
	if (options.share && options.user) {
		const share = createShare(file, options.user, {
			password: options.password,
			expiresInHours: options.expiresInHours
		});
		shareLink = shareUrl(share.slug, origin);
	}

	return {
		ok: true as const,
		file,
		url: path,
		absoluteUrl,
		thumbUrl,
		absoluteThumbUrl,
		markdown,
		html: `<img src="${absoluteUrl}" alt="${file.original_name.replaceAll('"', '&quot;')}" />`,
		bbcode: `[img]${absoluteUrl}[/img]`,
		shareUrl: shareLink
	};
}
