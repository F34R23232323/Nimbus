import { listFiles, popularTags, siteStats } from '$lib/server/files';
import { publicCollections } from '$lib/server/collections';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [recent, stats, tags, collections] = await Promise.all([
		listFiles({ publicOnly: true, kind: 'image', perPage: 12, sort: 'new' }),
		Promise.resolve(siteStats()),
		Promise.resolve(popularTags(10)),
		Promise.resolve(publicCollections(3))
	]);

	return {
		recent: recent.files,
		stats,
		tags,
		collections
	};
};
