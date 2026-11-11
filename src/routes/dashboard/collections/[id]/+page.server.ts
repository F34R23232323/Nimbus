import { error, fail, redirect } from '@sveltejs/kit';
import {
	addFile,
	collectionAncestors,
	collectionFiles,
	createCollection,
	deleteCollection,
	getCollection,
	listChildCollections,
	removeFile,
	updateCollection
} from '$lib/server/collections';
import { listFiles } from '$lib/server/files';
import { siteUrl } from '$lib/server/settings';
import { normalizeVisibility } from '$lib/visibility';
import type { Actions, PageServerLoad } from './$types';

async function owned(id: string, userId: number) {
	const collection = getCollection(id);
	if (!collection) throw error(404, 'Collection not found.');
	if (collection.user_id !== userId) throw error(403, 'You cannot edit this collection.');
	return collection;
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user) throw redirect(303, '/login?next=/dashboard/collections');
	const user = locals.user;
	const collection = await owned(params.id, user.id);
	const files = collectionFiles(collection.id);
	const children = listChildCollections(collection.id);
	const ancestors = collectionAncestors(collection.id);
	const library = await listFiles({ userId: user.id, perPage: 100, sort: 'new' });
	return {
		collection,
		ancestors,
		children,
		files,
		library: library.files.filter((file) => !files.some((entry) => entry.id === file.id)),
		base: siteUrl(url.origin)
	};
};

export const actions: Actions = {
	update: async ({ params, locals, request }) => {
		const user = locals.user!;
		const collection = await owned(params.id, user.id);
		const form = await request.formData();
		updateCollection(collection.id, user.id, {
			name: String(form.get('name') ?? '') || collection.name,
			description: String(form.get('description') ?? ''),
			visibility: normalizeVisibility(form.get('visibility')) ?? undefined
		});
		return { success: 'Collection updated.' };
	},

	createChild: async ({ params, locals, request }) => {
		const user = locals.user!;
		const collection = await owned(params.id, user.id);
		const form = await request.formData();
		const name = String(form.get('name') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const visibility = normalizeVisibility(form.get('visibility')) ?? 'public';
		if (!name) return fail(400, { error: 'Give the subfolder a name.' });
		try {
			createCollection(user.id, name, description, visibility, collection.id);
			return { success: 'Subfolder created.' };
		} catch (err) {
			return fail(400, { error: err instanceof Error ? err.message : 'Could not create subfolder.' });
		}
	},

	add: async ({ params, locals, request }) => {
		const user = locals.user!;
		const collection = await owned(params.id, user.id);
		const fileId = String((await request.formData()).get('fileId') ?? '');
		if (!fileId) return fail(400, { error: 'Choose a file.' });
		addFile(collection.id, fileId, user.id);
		return { success: 'File added.' };
	},

	remove: async ({ params, locals, request }) => {
		const user = locals.user!;
		const collection = await owned(params.id, user.id);
		const fileId = String((await request.formData()).get('fileId') ?? '');
		removeFile(collection.id, fileId, user.id);
		return { success: 'File removed.' };
	},

	delete: async ({ params, locals }) => {
		const user = locals.user!;
		await owned(params.id, user.id);
		deleteCollection(params.id, user.id);
		throw redirect(303, '/dashboard/collections');
	}
};
