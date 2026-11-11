import { error } from '@sveltejs/kit';
import { canManage, canView, getFile, touchDownload, touchView } from '$lib/server/files';
import { readStored } from '$lib/server/storage';
import { serveFile } from '$lib/server/serve';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals, request, url }) => {
	// Both /i/<id> and /i/<id>.<extension> resolve to the same file. File IDs
	// never contain dots, so everything after the first dot is only cosmetic.
	const fileId = params.id.split('.')[0] || params.id;
	const file = await getFile(fileId);
	if (!file || !canView(file, locals.user)) throw error(404, 'File not found.');
	if (!file.deleted_at && !canManage(file, locals.user)) {
		if (url.searchParams.has('download')) touchDownload(file.id);
		else touchView(file.id);
	}

	const buffer = await readStored(file.path);
	if (!buffer) throw error(404, 'The stored file is missing from disk.');

	return serveFile(file, buffer, request, { download: url.searchParams.has('download') });
};
