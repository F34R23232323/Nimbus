import { redirect } from '@sveltejs/kit';
import { unreadCount } from '$lib/server/notifications';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(303, `/login?next=${encodeURIComponent(url.pathname + url.search)}`);
	}
	return {
		user: locals.user,
		unread: unreadCount(locals.user.id)
	};
};
