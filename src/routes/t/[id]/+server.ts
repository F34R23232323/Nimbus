import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { canView, getFile } from '$lib/server/files';
import { readStored } from '$lib/server/storage';
import { serveFile } from '$lib/server/serve';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals, request }) => {
	const file = await getFile(params.id);
	const isAvatar = file
		? !!db.prepare('SELECT 1 FROM users WHERE avatar_file_id = ?').get(file.id)
		: false;
	if (!file || (!isAvatar && !canView(file, locals.user))) throw error(404, 'File not found.');

	// A WebP thumbnail only contains the first frame of an animated GIF. Serving
	// that thumbnail made GIFs appear frozen throughout galleries and collection
	// views. Always use the untouched GIF here so the browser retains the source
	// frame delays as well as the animation itself. This also fixes existing
	// uploads, which may already have a static thumbnail stored on disk.
	if (file.mime === 'image/gif' && file.pages > 1) {
		const original = await readStored(file.path);
		if (!original) throw error(404, 'Thumbnail unavailable.');
		return serveFile(file, original, request, { publicOverride: isAvatar || file.is_public === 1 });
	}

	if (file.thumb_path) {
		const thumb = await readStored(file.thumb_path);
		if (thumb) {
			const headers = new Headers();
			headers.set('Content-Type', 'image/webp');
			headers.set(
				'Cache-Control',
				isAvatar || file.is_public ? 'public, max-age=86400' : 'private, max-age=0'
			);
			headers.set('X-Content-Type-Options', 'nosniff');
			return new Response(new Uint8Array(thumb), { headers });
		}
	}

	const original = await readStored(file.path);
	if (!original) throw error(404, 'Thumbnail unavailable.');
	return serveFile(file, original, request, { publicOverride: isAvatar || file.is_public === 1 });
};
