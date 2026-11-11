import { redirect } from '@sveltejs/kit';
import { listFiles, userStats } from '$lib/server/files';
import { getSettings } from '$lib/server/settings';
import { normalizeVisibility } from '$lib/visibility';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(303, '/login?next=/dashboard/images');
	const user = locals.user;
	const q = url.searchParams.get('q')?.trim() ?? '';
	const visibilityParam = url.searchParams.get('visibility');
	const visibility = normalizeVisibility(visibilityParam) ?? undefined;
	const kindParam = url.searchParams.get('kind');
	const kind = kindParam === 'images' ? 'image' : kindParam === 'files' ? 'file' : undefined;
	const sortParam = url.searchParams.get('sort') ?? 'new';
	const sort = ['new', 'old', 'views', 'size', 'name'].includes(sortParam)
		? (sortParam as 'new' | 'old' | 'views' | 'size' | 'name')
		: 'new';
	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);

	const result = await listFiles({
		userId: user.id,
		q: q || undefined,
		visibility,
		kind,
		sort,
		page,
		perPage: 24
	});

	const settings = getSettings();
	const stats = userStats(user.id);
	return {
		...result,
		q,
		visibility: visibility ?? 'all',
		kind: kindParam ?? 'all',
		sort,
		stats,
		quota: user.storage_quota || settings.defaultQuota,
		directLinks: settings.directFileLinks
	};
};
