import { redirect } from '@sveltejs/kit';
import { activity, listFiles, userStats } from '$lib/server/files';
import { listShares } from '$lib/server/shares';
import { getSettings } from '$lib/server/settings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login?next=/dashboard');
	const user = locals.user;
	const settings = getSettings();
	const stats = userStats(user.id);
	const recent = await listFiles({ userId: user.id, perPage: 8, sort: 'new', includeDeleted: false });
	const shares = listShares(user.id).slice(0, 5);
	const quota = user.storage_quota || settings.defaultQuota;

	return {
		stats,
		recent: recent.files,
		shares,
		quota,
		activity: activity(user.id, 14)
	};
};
