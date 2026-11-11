import { fail, redirect } from '@sveltejs/kit';
import { createCollection, listCollections } from '$lib/server/collections';
import { normalizeVisibility } from '$lib/visibility';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(303, '/login?next=/dashboard/collections');
	const collections = listCollections(locals.user.id, true);
	return { collections, base: url.origin };
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const visibility = normalizeVisibility(form.get('visibility')) ?? 'public';
		if (!name) return fail(400, { error: 'Give your collection a name.' });
		try {
			createCollection(locals.user!.id, name, description, visibility);
			return { success: 'Collection created.' };
		} catch (err) {
			return fail(400, { error: err instanceof Error ? err.message : 'Could not create collection.' });
		}
	}
};
