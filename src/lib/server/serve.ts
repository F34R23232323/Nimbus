import type { FileRecord } from '$lib/types';
import { secureFilename } from './crypto';

function contentDisposition(record: FileRecord, download: boolean): string {
	const name = secureFilename(record.original_name || `${record.id}.${record.ext}`);
	const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, "'");
	const mode = download ? 'attachment' : 'inline';
	return `${mode}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export function serveFile(
	record: FileRecord,
	buffer: Buffer,
	request: Request,
	options: { download?: boolean; publicOverride?: boolean } = {}
): Response {
	const headers = new Headers();
	const etag = `"${record.hash}"`;
	const isPublic = options.publicOverride ?? record.is_public === 1;

	headers.set('Content-Type', record.mime);
	headers.set('Content-Disposition', contentDisposition(record, !!options.download));
	headers.set('X-Content-Type-Options', 'nosniff');
	headers.set('Accept-Ranges', 'bytes');
	headers.set('ETag', etag);
	headers.set('Last-Modified', new Date(record.created_at).toUTCString());
	headers.set(
		'Cache-Control',
		isPublic ? 'public, max-age=31536000, immutable' : 'private, max-age=0, must-revalidate'
	);
	if (record.mime === 'image/svg+xml') {
		headers.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox");
	}

	if (request.headers.get('if-none-match') === etag) {
		return new Response(null, { status: 304, headers });
	}

	const range = request.headers.get('range');
	if (range) {
		const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
		if (match) {
			const total = buffer.length;
			let start = match[1] ? Number(match[1]) : 0;
			let end = match[2] ? Number(match[2]) : total - 1;
			if (!match[1] && match[2]) {
				start = Math.max(0, total - Number(match[2]));
				end = total - 1;
			}
			if (Number.isFinite(start) && Number.isFinite(end) && start <= end && start < total) {
				end = Math.min(end, total - 1);
				const chunk = buffer.subarray(start, end + 1);
				headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
				headers.set('Content-Length', String(chunk.length));
				return new Response(new Uint8Array(chunk), { status: 206, headers });
			}
			headers.set('Content-Range', `bytes */${total}`);
			return new Response(null, { status: 416, headers });
		}
	}

	headers.set('Content-Length', String(buffer.length));
	return new Response(new Uint8Array(buffer), { status: 200, headers });
}
