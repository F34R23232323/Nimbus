import { fail, redirect } from '@sveltejs/kit';
import { listFiles, toggleBookmark } from '$lib/server/files';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) throw redirect(303, '/login?next=/dashboard/bookmarks');
	const result = await listFiles({
		bookmarkedBy: locals.user.id,
		publicAccess: true,
		perPage: 60,
		sort: 'new'
	});
	return { files: result.files, total: result.total };
};

export const actions: Actions = {
	remove: async ({ request, locals }) => {
		const fileId = String((await request.formData()).get('fileId') ?? '');
		if (!fileId) return fail(400, { error: 'File missing.' });
		toggleBookmark(fileId, locals.user!.id);
		return { success: 'Removed from bookmarks.' };
	}
};
