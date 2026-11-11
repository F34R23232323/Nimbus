import { json } from '@sveltejs/kit';
import { listFiles } from '$lib/server/files';
import { getSettings, siteUrl } from '$lib/server/settings';
import { fileAbsoluteUrl } from '$lib/server/urls';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
	const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 8) || 8, 1), 24);
	const kindParam = url.searchParams.get('kind');
	const kind = kindParam === 'images' ? 'image' : kindParam === 'files' ? 'file' : undefined;
	const result = await listFiles({ publicOnly: true, perPage: limit, sort: 'new', kind });
	const base = siteUrl(url.origin);
	const direct = getSettings().directFileLinks;

	return json({
		ok: true,
		total: result.total,
		files: result.files.map((file) => ({
			id: file.id,
			name: file.original_name,
			mime: file.mime,
			size: file.size,
			width: file.width,
			height: file.height,
			views: file.views,
			created_at: file.created_at,
			username: file.username ?? null,
			url: fileAbsoluteUrl(file, url.origin, direct),
			thumb_url: file.thumb_path ? `${base}/t/${file.id}` : null,
			page_url: `${base}/p/${file.id}`,
			tags: (file.tags ?? []).map((tag) => tag.name)
		}))
	});
};
