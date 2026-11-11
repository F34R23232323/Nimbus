import { listFiles } from '$lib/server/files';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	const tag = url.searchParams.get('tag') ?? '';
	const type = url.searchParams.get('type') === 'files' ? 'files' : url.searchParams.get('type') === 'images' ? 'images' : 'all';
	const sortParam = url.searchParams.get('sort') ?? 'new';
	const sort = ['new', 'old', 'views', 'name'].includes(sortParam)
		? (sortParam as 'new' | 'old' | 'views' | 'name')
		: 'new';
	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);

	const result = await listFiles({
		publicOnly: true,
		q: q || undefined,
		tag: tag || undefined,
		kind: type === 'images' ? 'image' : type === 'files' ? 'file' : undefined,
		sort,
		page,
		perPage: 24
	});

	return { ...result, q, tag, type, sort };
};
