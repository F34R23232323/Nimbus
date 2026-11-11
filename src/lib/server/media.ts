import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';

export type FileKind = 'image' | 'video' | 'audio' | 'document' | 'archive' | 'other';

const EXT_MIME: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	webp: 'image/webp',
	gif: 'image/gif',
	avif: 'image/avif',
	bmp: 'image/bmp',
	ico: 'image/x-icon',
	svg: 'image/svg+xml',
	tif: 'image/tiff',
	tiff: 'image/tiff',
	heic: 'image/heic',
	heif: 'image/heif',
	mp4: 'video/mp4',
	webm: 'video/webm',
	mov: 'video/quicktime',
	mp3: 'audio/mpeg',
	wav: 'audio/wav',
	pdf: 'application/pdf',
	zip: 'application/zip',
	txt: 'text/plain',
	md: 'text/markdown',
	csv: 'text/csv',
	json: 'application/json'
};

export const IMAGE_EXTENSIONS = new Set([
	'png',
	'jpg',
	'jpeg',
	'webp',
	'gif',
	'avif',
	'bmp',
	'ico',
	'svg',
	'tif',
	'tiff',
	'heic',
	'heif'
]);

export interface Detected {
	mime: string;
	ext: string;
	kind: FileKind;
}

export function extensionFromName(name: string): string {
	const match = /\.([a-z0-9]{1,8})$/i.exec(name.trim());
	return (match?.[1] ?? '').toLowerCase();
}

export function kindOf(mime: string, ext: string): FileKind {
	if (mime.startsWith('image/')) return 'image';
	if (mime.startsWith('video/')) return 'video';
	if (mime.startsWith('audio/')) return 'audio';
	if (['pdf', 'txt', 'md', 'csv', 'json'].includes(ext) || mime.startsWith('text/')) return 'document';
	if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
	return 'other';
}

export async function detectFile(buffer: Buffer, filename: string): Promise<Detected> {
	const guessedExt = extensionFromName(filename);
	let mime = '';
	let ext = guessedExt;

	const sniffed = await fileTypeFromBuffer(buffer).catch(() => undefined);
	if (sniffed) {
		mime = sniffed.mime;
		ext = sniffed.ext === 'jpg' ? 'jpg' : sniffed.ext;
	}

	const head = buffer.subarray(0, 1024).toString('utf8').trimStart().toLowerCase();
	if (!sniffed && (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg')))) {
		mime = 'image/svg+xml';
		ext = 'svg';
	}

	if (!mime) {
		mime = EXT_MIME[ext] || 'application/octet-stream';
	}
	if (!ext) ext = 'bin';
	if (mime === 'image/jpg') mime = 'image/jpeg';
	if (mime === 'image/gif' && ext === 'gif') ext = 'gif';

	return { mime, ext, kind: kindOf(mime, ext) };
}

export interface ImageProbe {
	width: number | null;
	height: number | null;
	pages: number;
	format: string | null;
	metadata: Record<string, unknown>;
}

export async function probeImage(buffer: Buffer): Promise<ImageProbe> {
	try {
		const meta = await sharp(buffer, { animated: true, limitInputPixels: 300_000_000 }).metadata();
		return {
			width: meta.width ?? null,
			height: meta.pageHeight && meta.pages && meta.pages > 1 ? meta.pageHeight : meta.height ?? null,
			pages: meta.pages ?? 1,
			format: meta.format ?? null,
			metadata: {
				format: meta.format,
				width: meta.width,
				height: meta.height,
				space: meta.space,
				channels: meta.channels,
				depth: meta.depth,
				density: meta.density,
				orientation: meta.orientation,
				hasAlpha: meta.hasAlpha,
				pages: meta.pages ?? 1,
				pageHeight: meta.pageHeight,
				loop: meta.loop,
				delay: meta.delay
			}
		};
	} catch {
		return { width: null, height: null, pages: 1, format: null, metadata: {} };
	}
}

export async function makeThumbnail(buffer: Buffer, kind: FileKind): Promise<Buffer | null> {
	if (kind !== 'image') return null;
	try {
		const out = await sharp(buffer, { animated: false, limitInputPixels: 300_000_000 })
			.rotate()
			.resize(720, 720, { fit: 'inside', withoutEnlargement: true })
			.webp({ quality: 78, effort: 4 })
			.toBuffer();
		return out;
	} catch {
		return null;
	}
}

export async function normalizeForBrowser(buffer: Buffer, mime: string): Promise<Buffer | null> {
	try {
		if (mime !== 'image/jpeg') return null;
		const meta = await sharp(buffer, { animated: true }).metadata();
		if ((meta.pages ?? 1) > 1) return null;
		const needsConversion =
			meta.format !== 'jpeg' ||
			meta.space === 'cmyk' ||
			meta.space === 'multiband' ||
			meta.channels === 4 ||
			meta.depth === 'ushort';
		if (!needsConversion) return null;
		return await sharp(buffer)
			.rotate()
			.toColourspace('srgb')
			.jpeg({ quality: 92, progressive: true })
			.toBuffer();
	} catch {
		return null;
	}
}

export async function compressImage(buffer: Buffer, mime: string): Promise<Buffer | null> {
	try {
		const meta = await sharp(buffer, { animated: true }).metadata();
		if ((meta.pages ?? 1) > 1) return null;
		if (mime === 'image/jpeg') {
			const out = await sharp(buffer).rotate().resize(2560, 2560, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82, progressive: true, mozjpeg: false }).toBuffer();
			return out.length < buffer.length ? out : null;
		}
		if (mime === 'image/webp') {
			const out = await sharp(buffer).resize(2560, 2560, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82, effort: 4 }).toBuffer();
			return out.length < buffer.length ? out : null;
		}
		if (mime === 'image/png') {
			const out = await sharp(buffer).rotate().resize(2560, 2560, { fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9, palette: true }).toBuffer();
			return out.length < buffer.length ? out : null;
		}
		return null;
	} catch {
		return null;
	}
}

export async function stripMetadata(buffer: Buffer, mime: string): Promise<Buffer | null> {
	try {
		const meta = await sharp(buffer, { animated: true }).metadata();
		if ((meta.pages ?? 1) > 1) return null;
		const image = sharp(buffer).rotate();
		if (mime === 'image/jpeg') return await image.jpeg({ quality: 92, progressive: true }).toBuffer();
		if (mime === 'image/png') return await image.png({ compressionLevel: 9 }).toBuffer();
		if (mime === 'image/webp') return await image.webp({ quality: 92 }).toBuffer();
		if (mime === 'image/tiff') return await image.tiff({ quality: 92 }).toBuffer();
		if (mime === 'image/avif') return await image.avif({ quality: 55 }).toBuffer();
		return null;
	} catch {
		return null;
	}
}
