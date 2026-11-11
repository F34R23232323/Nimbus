import { fail, redirect } from '@sveltejs/kit';
import { createTag, deleteTag, listTags, updateTag } from '$lib/server/tags';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(303, '/login?next=/dashboard/tags');
	return { tags: listTags(locals.user.id), base: url.origin };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const parentId = Number(form.get('parentId') ?? 0) || null;
		const color = String(form.get('color') ?? '');
		if (!name) return fail(400, { error: 'Tag name is required.' });
		try {
			createTag(locals.user!.id, name, parentId, color);
			return { success: 'Tag created.' };
		} catch (err) {
			return fail(400, { error: err instanceof Error ? err.message : 'Could not create tag.' });
		}
	},

	update: async ({ request, locals }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));
		const name = String(form.get('name') ?? '');
		const parentId = Number(form.get('parentId') ?? 0) || null;
		const color = String(form.get('color') ?? '');
		try {
			updateTag(id, locals.user!.id, { name, parentId, color });
			return { success: 'Tag updated.' };
		} catch (err) {
			return fail(400, { error: err instanceof Error ? err.message : 'Could not update tag.' });
		}
	},

	delete: async ({ request, locals }) => {
		const id = Number((await request.formData()).get('id'));
		deleteTag(id, locals.user!.id);
		return { success: 'Tag deleted.' };
	}
};
