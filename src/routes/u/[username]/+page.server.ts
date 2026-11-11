import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { getUserByUsername } from '$lib/server/auth';
import { listFiles } from '$lib/server/files';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const profile = getUserByUsername(params.username);
	if (!profile) throw error(404, 'That user does not exist.');

	const page = Math.max(1, Number(url.searchParams.get('page') ?? 1) || 1);
	const files = await listFiles({ userId: profile.id, publicOnly: true, perPage: 18, page, sort: 'new' });

	const collections = db
		.prepare(
			`SELECT c.*, (SELECT COUNT(*) FROM collection_files cf JOIN files f ON f.id = cf.file_id
				WHERE cf.collection_id = c.id AND f.is_public = 1 AND f.deleted_at IS NULL) AS file_count
			 FROM collections c WHERE c.user_id = ? AND c.is_public = 1 AND c.listed = 1 AND c.parent_id IS NULL ORDER BY c.created_at DESC`
		)
		.all(profile.id) as { id: number; slug: string; name: string; file_count: number }[];

	return {
		profile,
		files: files.files,
		total: files.total,
		page: files.page,
		pages: files.pages,
		collections,
		isOwner: locals.user?.id === profile.id
	};
};
