import { error, json } from '@sveltejs/kit';
import { httpErrorDetails } from '$lib/server/httpError';
import { assertCanUpload } from '$lib/server/auth';
import { processUpload } from '$lib/server/files';
import { addFile, resolveUploadCollection } from '$lib/server/collections';
import { imagesToGif, type GifEffect, type GifTransition } from '$lib/server/gif';
import { getSettings } from '$lib/server/settings';
import { rateLimit, clientIp } from '$lib/server/ratelimit';
import { uploadPayload } from '$lib/server/uploadResponse';
import { normalizeVisibility } from '$lib/visibility';
import type { RequestHandler } from './$types';

const effects = new Set([
	'none',
	'zoom-in',
	'zoom-out',
	'pan-left',
	'pan-right',
	'pulse',
	'shake',
	'bounce',
	'rotate',
	'fade-in'
]);

function numberField(form: FormData, key: string): number | undefined {
	const raw = form.get(key);
	if (raw === null || raw === '') return undefined;
	const value = Number(raw);
	return Number.isFinite(value) ? value : undefined;
}

export const POST: RequestHandler = async ({ request, locals, url }) => {
	try {
		const user = assertCanUpload(locals.user);
		const settings = getSettings();
		const ip = clientIp(request);

		if (!rateLimit(`gif:${user?.id ?? ip}`, 12, 60_000)) {
			throw error(429, 'Too many GIF jobs. Wait a moment and try again.');
		}

		const contentLength = Number(request.headers.get('content-length') ?? 0);
		if (contentLength > settings.maxUploadSize * 6) {
			throw error(413, 'The source files are too large for one GIF job.');
		}

		const form = await request.formData();
		const files = [...form.getAll('frames'), ...form.getAll('file')].filter(
			(entry): entry is File => entry instanceof File && entry.size > 0
		);

		if (!files.length) throw error(400, 'Add at least one image.');
		if (files.length > 24) throw error(400, 'You can combine up to 24 images at a time.');
		for (const file of files) {
			if (file.type && !file.type.startsWith('image/')) throw error(415, `${file.name} is not an image.`);
			if (file.size > settings.maxUploadSize) throw error(413, `${file.name} is too large.`);
		}

		const buffers = await Promise.all(files.map(async (file) => Buffer.from(await file.arrayBuffer())));
		const effectRaw = String(form.get('effect') ?? 'none');

		const gif = await imagesToGif(buffers, {
			width: numberField(form, 'width'),
			height: numberField(form, 'height'),
			delay: numberField(form, 'delay'),
			frames: numberField(form, 'frames'),
			hold: numberField(form, 'hold'),
			colors: numberField(form, 'colors'),
			loop: form.get('loop') === '1' ? 0 : -1,
			effect: (effects.has(effectRaw) ? effectRaw : 'none') as GifEffect,
			transition: (form.get('transition') === 'none' ? 'none' : 'fade') as GifTransition,
			fit: form.get('fit') === 'cover' ? 'cover' : 'contain',
			background: String(form.get('background') ?? '#0a0c16')
		});

		const visibility =
			normalizeVisibility(form.get('visibility')) ??
			(form.has('isPublic')
				? form.get('isPublic') === '1'
					? 'public'
					: 'private'
				: settings.defaultVisibility);

		const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
		const requestedName = String(form.get('name') ?? '').trim();
		const filename = requestedName
			? requestedName.toLowerCase().endsWith('.gif')
				? requestedName
				: `${requestedName}.gif`
			: `nimbus-${stamp}.gif`;
		const result = await processUpload({
			buffer: gif,
			filename,
			userId: user.id,
			visibility,
			tags: String(form.get('tags') ?? '')
		});

		const collectionId = resolveUploadCollection(user.id, {
			id: String(form.get('collectionId') ?? ''),
			name: String(form.get('collection') ?? '')
		});
		if (collectionId) addFile(collectionId, result.file.id, user.id);

		return json({
			...uploadPayload(result.file, url.origin, { user }),
			sourceCount: files.length
		});
	} catch (err) {
		const httpError = httpErrorDetails(err);
		if (httpError) {
			return json({ ok: false, error: httpError.message }, { status: httpError.status });
		}
		const message = err instanceof Error ? err.message : 'GIF generation failed.';
		console.error('[nimbus] gif failed', err);
		return json({ ok: false, error: message }, { status: 400 });
	}
};
