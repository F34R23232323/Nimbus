import { error } from '@sveltejs/kit';
import {
	collectionAncestors,
	collectionFiles,
	getCollectionBySlug,
	listChildCollections
} from '$lib/server/collections';
import { getUserById } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const collection = getCollectionBySlug(params.slug);
	if (!collection) throw error(404, 'Collection not found.');

	const owner = getUserById(collection.user_id);
	const isOwner = locals.user?.id === collection.user_id;
	if (!collection.is_public && !isOwner && locals.user?.role !== 'admin') {
		throw error(404, 'Collection not found.');
	}

	const canSeeAll = isOwner || locals.user?.role === 'admin';
	const files = collectionFiles(collection.id).filter(
		(file) => canSeeAll || file.is_public === 1
	);
	const children = listChildCollections(collection.id, { publicOnly: !canSeeAll });
	const ancestors = collectionAncestors(collection.id).filter(
		(ancestor) => canSeeAll || ancestor.is_public === 1
	);

	return { collection, ancestors, children, files, owner, isOwner };
};
