import { getSettings, publicSettings } from '$lib/server/settings';
import { unreadCount } from '$lib/server/notifications';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const settings = getSettings();
	return {
		user: locals.user,
		site: publicSettings(settings),
		theme: locals.theme,
		unread: locals.user ? unreadCount(locals.user.id) : 0
	};
};
