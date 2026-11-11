import { redirect } from '@sveltejs/kit';
import { getSettings } from '$lib/server/settings';
import { listCollections } from '$lib/server/collections';
import { listTags } from '$lib/server/tags';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login?next=/dashboard/upload');
	}

	const user = locals.user;
	const settings = getSettings();
	const blockedReason =
		user.status === 'pending'
			? 'Your account is awaiting administrator approval.'
			: user.status === 'banned'
				? 'Your account has been suspended.'
				: settings.maintenance && user.role !== 'admin'
					? 'The instance is in maintenance mode. Uploads are temporarily paused.'
					: null;

	return {
		canUpload: !blockedReason,
		blockedReason,
		maxUploadSize: settings.maxUploadSize,
		allowedExtensions: settings.allowedExtensions,
		defaultVisibility: settings.defaultVisibility,
		compressByDefault: settings.compressByDefault,
		collections: listCollections(user.id),
		tags: listTags(user.id)
	};
};
