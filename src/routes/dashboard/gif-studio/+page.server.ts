import { redirect } from '@sveltejs/kit';
import { getSettings } from '$lib/server/settings';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login?next=/dashboard/gif-studio');

	const user = locals.user;
	const settings = getSettings();
	const blockedReason =
		user.status === 'pending'
			? 'Your account is awaiting administrator approval.'
			: user.status === 'banned'
				? 'Your account has been suspended.'
				: settings.maintenance && user.role !== 'admin'
					? 'The instance is in maintenance mode. GIF generation is paused.'
					: null;

	return {
		canUpload: !blockedReason,
		blockedReason,
		maxUploadSize: settings.maxUploadSize,
		defaultVisibility: settings.defaultVisibility
	};
};
