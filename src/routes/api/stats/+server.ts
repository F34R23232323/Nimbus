import { json } from '@sveltejs/kit';
import { popularTags, siteStats } from '$lib/server/files';
import { getSettings } from '$lib/server/settings';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const settings = getSettings();
	const stats = siteStats();
	return json({
		ok: true,
		site: {
			name: settings.siteName,
			description: settings.siteDescription,
			registrationEnabled: settings.registrationEnabled
		},
		stats: {
			files: stats.count,
			publicFiles: stats.publicCount,
			size: stats.size,
			views: stats.views,
			users: stats.users,
			shares: stats.shares
		},
		tags: popularTags(8).map((tag) => ({ name: tag.name, slug: tag.slug, count: tag.file_count }))
	});
};
