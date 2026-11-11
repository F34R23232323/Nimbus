import { error } from '@sveltejs/kit';
import { getFile } from '$lib/server/files';
import { getShareBySlug, hasShareAccess, isExpired } from '$lib/server/shares';
import { readStored } from '$lib/server/storage';
import { serveFile } from '$lib/server/serve';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, cookies, request, url }) => {
	const share = getShareBySlug(params.slug);
	if (!share) throw error(404, 'Share not found.');
	if (isExpired(share)) throw error(410, 'This share has expired.');
	if (!hasShareAccess(cookies, share)) throw error(401, 'This share requires a password.');

	const file = await getFile(share.file_id);
	if (!file || file.deleted_at) throw error(404, 'The shared file is no longer available.');

	const buffer = await readStored(file.path);
	if (!buffer) throw error(404, 'The stored file is missing from disk.');

	return serveFile(file, buffer, request, {
		download: url.searchParams.has('download'),
		publicOverride: false
	});
};
