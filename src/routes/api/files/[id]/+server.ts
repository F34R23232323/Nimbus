import { error, json } from '@sveltejs/kit';
import { httpErrorDetails } from '$lib/server/httpError';
import { db } from '$lib/server/db';
import { canManage, deleteFile, getFile, getFileDetail, replaceTags } from '$lib/server/files';
import { addFile } from '$lib/server/collections';
import { secureFilename } from '$lib/server/crypto';
import { requireUser } from '$lib/server/auth';
import { normalizeVisibility, visibilityFlags } from '$lib/visibility';
import type { RequestHandler } from './$types';

function handle(err: unknown) {
	const httpError = httpErrorDetails(err);
	if (httpError) return json({ ok: false, error: httpError.message }, { status: httpError.status });
	console.error('[nimbus] file api error', err);
	return json({ ok: false, error: 'Unexpected error.' }, { status: 500 });
}

export const PATCH: RequestHandler = async ({ params, locals, request }) => {
	try {
		const user = requireUser(locals.user);
		const file = await getFile(params.id);
		if (!file || file.deleted_at) throw error(404, 'File not found.');
		if (!canManage(file, user)) throw error(403, 'You cannot edit this file.');

		const body = (await request.json().catch(() => ({}))) as {
			name?: string;
			isPublic?: boolean | number;
			visibility?: string;
			tags?: string;
			collectionId?: string;
		};

		if (typeof body.name === 'string' && body.name.trim()) {
			db.prepare('UPDATE files SET original_name = ? WHERE id = ?').run(
				secureFilename(body.name.trim()).slice(0, 180),
				file.id
			);
		}
		const visibility = normalizeVisibility(body.visibility);
		if (visibility) {
			const flags = visibilityFlags(visibility);
			db.prepare('UPDATE files SET is_public = ?, listed = ? WHERE id = ?').run(
				flags.isPublic,
				flags.listed,
				file.id
			);
		} else if (body.isPublic !== undefined) {
			db.prepare('UPDATE files SET is_public = ?, listed = ? WHERE id = ?').run(
				body.isPublic ? 1 : 0,
				body.isPublic ? 1 : 0,
				file.id
			);
		}
		if (typeof body.tags === 'string') {
			await replaceTags(file.id, body.tags, user.id);
		}
		if (typeof body.collectionId === 'string' && body.collectionId) {
			addFile(body.collectionId, file.id, user.id);
		}

		return json({ ok: true, file: await getFileDetail(file.id) });
	} catch (err) {
		return handle(err);
	}
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		const user = requireUser(locals.user);
		const file = await getFile(params.id);
		if (!file || file.deleted_at) throw error(404, 'File not found.');
		await deleteFile(file, user);
		return json({ ok: true });
	} catch (err) {
		return handle(err);
	}
};

export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		const user = requireUser(locals.user);
		const file = await getFileDetail(params.id);
		if (!file || file.deleted_at) throw error(404, 'File not found.');
		if (!canManage(file, user)) throw error(403, 'You cannot view this file.');
		return json({ ok: true, file });
	} catch (err) {
		return handle(err);
	}
};
