import { redirect } from '@sveltejs/kit';
import { listNotifications, markRead, removeNotification } from '$lib/server/notifications';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login?next=/dashboard/notifications');
	return { notifications: listNotifications(locals.user.id, 80) };
};

export const actions: Actions = {
	markAll: async ({ locals }) => {
		markRead(locals.user!.id);
		return { success: 'All notifications marked as read.' };
	},
	markOne: async ({ locals, request }) => {
		const id = Number((await request.formData()).get('id'));
		markRead(locals.user!.id, id);
		return { success: 'Marked as read.' };
	},
	remove: async ({ locals, request }) => {
		const id = Number((await request.formData()).get('id'));
		removeNotification(locals.user!.id, id);
		return { success: 'Notification removed.' };
	}
};
