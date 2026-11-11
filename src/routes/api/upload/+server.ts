import { error, json } from '@sveltejs/kit';
import { httpErrorDetails } from '$lib/server/httpError';
import { assertCanUpload, requireUser } from '$lib/server/auth';
import { getSettings } from '$lib/server/settings';
import { processUpload } from '$lib/server/files';
import { addFile, resolveUploadCollection } from '$lib/server/collections';
import { rateLimit, clientIp } from '$lib/server/ratelimit';
import { uploadPayload } from '$lib/server/uploadResponse';
import { logAudit } from '$lib/server/audit';
import { normalizeVisibility } from '$lib/visibility';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, url }) => {
	try {
		const user = assertCanUpload(locals.user);
		const settings = getSettings();
		const ip = clientIp(request);

		if (!rateLimit(`upload:${user?.id ?? ip}`, 60, 60_000)) {
			throw error(429, 'Too many uploads. Slow down a little.');
		}

		const contentLength = Number(request.headers.get('content-length') ?? 0);
		if (contentLength > settings.maxUploadSize + 1_000_000) {
			throw error(413, 'This request is larger than the upload limit.');
		}

		const form = await request.formData();
		const entry = form.get('file') ?? form.get('files');
		if (!(entry instanceof File) || entry.size === 0) {
			throw error(400, 'No file was provided.');
		}

		const buffer = Buffer.from(await entry.arrayBuffer());
		const visibility =
			normalizeVisibility(form.get('visibility')) ??
			(form.has('isPublic')
				? form.get('isPublic') === '1' || form.get('isPublic') === 'true'
					? 'public'
					: 'private'
				: settings.defaultVisibility);

		const result = await processUpload({
			buffer,
			filename: entry.name || 'upload',
			userId: user.id,
			visibility,
			compress: form.get('compress') === '1' || form.get('compress') === 'true',
			tags: String(form.get('tags') ?? '')
		});

		const collectionId = resolveUploadCollection(user.id, {
			id: String(form.get('collectionId') ?? ''),
			name: String(form.get('collection') ?? '')
		});
		if (collectionId) addFile(collectionId, result.file.id, user.id);

		const payload = uploadPayload(result.file, url.origin, {
			user,
			share: form.get('share') === '1',
			password: String(form.get('password') ?? '') || undefined,
			expiresInHours: Number(form.get('expiresInHours') ?? 0) || undefined
		});

		if (user) logAudit(user.id, 'file.upload', { id: result.file.id, name: entry.name }, ip);

		return json({ ...payload, duplicate: result.duplicate });
	} catch (err) {
		const httpError = httpErrorDetails(err);
		if (httpError) {
			return json({ ok: false, error: httpError.message }, { status: httpError.status });
		}
		console.error('[nimbus] upload failed', err);
		return json({ ok: false, error: 'Upload failed unexpectedly.' }, { status: 500 });
	}
};

export const GET: RequestHandler = async ({ locals }) => {
	requireUser(locals.user);
	return json({ ok: true, message: 'POST multipart/form-data with a "file" field.' });
};
