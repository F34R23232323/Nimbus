import sharp from 'sharp';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const gifenc = require('gifenc') as typeof import('gifenc');
const { GIFEncoder, quantize, applyPalette } = gifenc;

export type GifEffect =
	| 'none'
	| 'zoom-in'
	| 'zoom-out'
	| 'pan-left'
	| 'pan-right'
	| 'pulse'
	| 'shake'
	| 'bounce'
	| 'rotate'
	| 'fade-in';

export type GifTransition = 'none' | 'fade';

export interface GifOptions {
	width?: number;
	height?: number;
	delay?: number;
	loop?: number;
	colors?: number;
	effect?: GifEffect;
	transition?: GifTransition;
	fit?: 'contain' | 'cover';
	background?: string;
	frames?: number;
	hold?: number;
}

type RGBA = Uint8Array;

const MAX_FRAMES = 120;

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

function parseBackground(input?: string): { r: number; g: number; b: number } {
	const fallback = { r: 10, g: 12, b: 22 };
	if (!input) return fallback;
	const hex = input.replace('#', '');
	if (!/^[0-9a-fA-F]{6}$/.test(hex)) return fallback;
	return {
		r: parseInt(hex.slice(0, 2), 16),
		g: parseInt(hex.slice(2, 4), 16),
		b: parseInt(hex.slice(4, 6), 16)
	};
}

async function rawOf(input: Buffer | RGBA, width?: number, height?: number): Promise<{
	data: RGBA;
	width: number;
	height: number;
}> {
	if (input instanceof Uint8Array && width && height) {
		return { data: input, width, height };
	}
	const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
	const { data, info } = await sharp(buffer, { animated: false, limitInputPixels: 300_000_000 })
		.rotate()
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	return { data: new Uint8Array(data), width: info.width, height: info.height };
}

async function fitFrame(
	source: RGBA,
	width: number,
	height: number,
	targetWidth: number,
	targetHeight: number,
	fit: 'contain' | 'cover',
	background: { r: number; g: number; b: number }
): Promise<RGBA> {
	const { data } = await sharp(source, { raw: { width, height, channels: 4 } })
		.resize(targetWidth, targetHeight, {
			fit,
			background: { ...background, alpha: 1 }
		})
		.flatten({ background })
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true });
	return new Uint8Array(data);
}

async function sourceFrames(
	buffer: Buffer,
	targetWidth: number,
	targetHeight: number,
	options: Required<Pick<GifOptions, 'fit'>> & { background: { r: number; g: number; b: number } },
	frameLimit: number = MAX_FRAMES
): Promise<RGBA[]> {
	let meta: { pages?: number; width?: number; height?: number; pageHeight?: number };
	try {
		meta = await sharp(buffer, { animated: true, limitInputPixels: 300_000_000 }).metadata();
	} catch {
		throw new Error('That file could not be decoded as an image.');
	}
	const pages = Math.max(1, meta.pages ?? 1);

	if (pages > 1) {
		const { data, info } = await sharp(buffer, { animated: true, limitInputPixels: 300_000_000 })
			.ensureAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });
		const frameHeight = Math.floor(info.height / pages);
		const step = Math.max(1, Math.ceil(pages / frameLimit));
		const frames: RGBA[] = [];
		for (let page = 0; page < pages; page += step) {
			const offset = page * frameHeight * info.width * 4;
			const slice = data.subarray(offset, offset + frameHeight * info.width * 4);
			const frame = await fitFrame(
				new Uint8Array(slice),
				info.width,
				frameHeight,
				targetWidth,
				targetHeight,
				options.fit === 'cover' ? 'cover' : 'contain',
				options.background
			);
			frames.push(frame);
		}
		return frames;
	}

	const raw = await rawOf(buffer);
	return [
		await fitFrame(
			raw.data,
			raw.width,
			raw.height,
			targetWidth,
			targetHeight,
			options.fit,
			options.background
		)
	];
}

async function effectFrames(
	base: RGBA,
	width: number,
	height: number,
	effect: GifEffect,
	count: number,
	background: { r: number; g: number; b: number }
): Promise<RGBA[]> {
	if (effect === 'none' || count <= 1) return [base];
	const frames: RGBA[] = [];

	for (let i = 0; i < count; i++) {
		const t = count <= 1 ? 0 : i / (count - 1);
		let pipeline = sharp(base, { raw: { width, height, channels: 4 } });

		if (effect === 'zoom-in' || effect === 'zoom-out' || effect === 'pulse') {
			let scale = 1;
			if (effect === 'zoom-in') scale = 1 + 0.24 * t;
			else if (effect === 'zoom-out') scale = 1.24 - 0.24 * t;
			else scale = 1 + 0.11 * Math.abs(Math.sin(t * Math.PI * 2));
			const w = Math.max(2, Math.round(width * scale));
			const h = Math.max(2, Math.round(height * scale));
			const resized = await sharp(base, { raw: { width, height, channels: 4 } })
				.resize(w, h, { fit: 'fill' })
				.raw()
				.toBuffer();
			const left = clamp(Math.round((w - width) / 2), 0, Math.max(0, w - width));
			const top = clamp(Math.round((h - height) / 2), 0, Math.max(0, h - height));
			pipeline = sharp(resized, { raw: { width: w, height: h, channels: 4 } }).extract({
				left,
				top,
				width: Math.min(width, w),
				height: Math.min(height, h)
			});
		} else if (effect === 'pan-left' || effect === 'pan-right') {
			const scale = 1.22;
			const w = Math.round(width * scale);
			const h = Math.round(height * scale);
			const resized = await sharp(base, { raw: { width, height, channels: 4 } })
				.resize(w, h, { fit: 'fill' })
				.raw()
				.toBuffer();
			const range = w - width;
			const left = effect === 'pan-left' ? Math.round(range * (1 - t)) : Math.round(range * t);
			pipeline = sharp(resized, { raw: { width: w, height: h, channels: 4 } }).extract({
				left,
				top: Math.round((h - height) / 2),
				width,
				height
			});
		} else if (effect === 'shake') {
			const dx = Math.round(Math.sin(t * Math.PI * 10) * 7);
			const dy = Math.round(Math.cos(t * Math.PI * 8) * 4);
			pipeline = sharp(base, { raw: { width, height, channels: 4 } })
				.extend({ top: dy > 0 ? dy : 0, bottom: dy < 0 ? -dy : 0, left: dx > 0 ? dx : 0, right: dx < 0 ? -dx : 0, background: { ...background, alpha: 1 } })
				.extract({ left: dx > 0 ? dx : 0, top: dy > 0 ? dy : 0, width, height });
		} else if (effect === 'bounce') {
			const dy = Math.round(Math.abs(Math.sin(t * Math.PI * 3)) * 14);
			pipeline = sharp(base, { raw: { width, height, channels: 4 } })
				.extend({ top: dy, bottom: 0, left: 0, right: 0, background: { ...background, alpha: 1 } })
				.extract({ left: 0, top: dy, width, height });
		} else if (effect === 'rotate') {
			const angle = (t - 0.5) * 7;
			pipeline = sharp(base, { raw: { width, height, channels: 4 } })
				.rotate(angle, { background: { ...background, alpha: 1 } })
				.resize(width, height, { fit: 'cover', background: { ...background, alpha: 1 } });
		} else if (effect === 'fade-in') {
			const alpha = 0.08 + 0.92 * t;
			pipeline = sharp(base, { raw: { width, height, channels: 4 } }).linear([1, 1, 1, alpha], [0, 0, 0, 0]);
		}

		const { data } = await pipeline
			.flatten({ background })
			.ensureAlpha()
			.raw()
			.toBuffer({ resolveWithObject: true });
		frames.push(new Uint8Array(data));
	}
	return frames;
}

function blend(a: RGBA, b: RGBA, t: number): RGBA {
	const out = new Uint8Array(a.length);
	for (let i = 0; i < a.length; i += 4) {
		out[i] = Math.round(a[i] * (1 - t) + b[i] * t);
		out[i + 1] = Math.round(a[i + 1] * (1 - t) + b[i + 1] * t);
		out[i + 2] = Math.round(a[i + 2] * (1 - t) + b[i + 2] * t);
		out[i + 3] = 255;
	}
	return out;
}

export async function imagesToGif(buffers: Buffer[], options: GifOptions = {}): Promise<Buffer> {
	if (!buffers.length) throw new Error('Add at least one image to build a GIF.');
	if (buffers.length > 24) throw new Error('You can combine up to 24 images at a time.');

	const background = parseBackground(options.background);
	const fit = options.fit ?? 'contain';
	const effect = options.effect ?? 'none';
	const transition = options.transition ?? 'fade';
	const delay = clamp(Math.round(options.delay ?? 80), 20, 2000);
	const loop = options.loop === -1 ? -1 : 0;
	const colors = clamp(Math.round(options.colors ?? 256), 8, 256);

	const firstMeta = await sharp(buffers[0], { animated: true }).metadata().catch(() => null);
	const aspect =
		firstMeta?.pageHeight && firstMeta.pages && firstMeta.pages > 1
			? firstMeta.pageHeight / (firstMeta.width ?? 1)
			: (firstMeta?.height ?? 1) / (firstMeta?.width ?? 1);
	const targetWidth = clamp(Math.round(options.width ?? firstMeta?.width ?? 480), 64, 1600);
	const targetHeight = clamp(
		Math.round(options.height ?? targetWidth * (aspect || 1)),
		64,
		1600
	);
	const pixelBudget = 60_000_000;
	const maxFrames = Math.max(
		2,
		Math.min(MAX_FRAMES, Math.floor(pixelBudget / (targetWidth * targetHeight)))
	);

	const prepared: RGBA[][] = [];
	for (const buffer of buffers) {
		prepared.push(
			await sourceFrames(buffer, targetWidth, targetHeight, { fit, background }, maxFrames)
		);
	}

	let frames: RGBA[] = [];

	if (prepared.length === 1) {
		const [source] = prepared;
		if (source.length > 1) {
			frames = source.slice(0, maxFrames);
		} else if (effect !== 'none') {
			frames = await effectFrames(
				source[0],
				targetWidth,
				targetHeight,
				effect,
				clamp(Math.round(options.frames ?? 24), 2, Math.max(2, Math.min(90, maxFrames))),
				background
			);
		} else {
			frames = source;
		}
	} else {
		const useFade = transition === 'fade';
		const budgetPerImage = Math.max(1, Math.floor(maxFrames / prepared.length));
		const fadeSteps = useFade ? Math.min(6, Math.max(0, budgetPerImage - 1)) : 0;
		const hold = clamp(
			Math.min(Math.round(options.hold ?? 10), budgetPerImage - fadeSteps),
			1,
			60
		);
		prepared.forEach((source, index) => {
			const base = source[0];
			for (let i = 0; i < hold; i++) frames.push(base);
			const next = prepared[index + 1]?.[0];
			if (next && useFade) {
				for (let step = 1; step <= fadeSteps; step++) frames.push(blend(base, next, step / (fadeSteps + 1)));
			}
		});
	}

	if (frames.length > maxFrames) {
		const step = Math.ceil(frames.length / maxFrames);
		frames = frames.filter((_, index) => index % step === 0);
	}

	return encodeGif(frames, targetWidth, targetHeight, { delay, loop, colors });
}

export function encodeGif(
	frames: RGBA[],
	width: number,
	height: number,
	options: { delay: number; loop: number; colors: number }
): Buffer {
	const gif = GIFEncoder({ initialCapacity: Math.max(4096, width * height * frames.length) });
	frames.forEach((frame, index) => {
		const palette = quantize(frame, options.colors, { format: 'rgb565' });
		const indexed = applyPalette(frame, palette, 'rgb565');
		gif.writeFrame(indexed, width, height, {
			palette,
			delay: options.delay,
			repeat: index === 0 ? options.loop : undefined,
			dispose: 2
		});
	});
	gif.finish();
	const bytes = gif.bytes();
	return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

export function gifEffectOptions(): { value: GifEffect; label: string }[] {
	return [
		{ value: 'none', label: 'No effect (still image)' },
		{ value: 'zoom-in', label: 'Zoom in' },
		{ value: 'zoom-out', label: 'Zoom out' },
		{ value: 'pulse', label: 'Pulse' },
		{ value: 'pan-left', label: 'Pan left' },
		{ value: 'pan-right', label: 'Pan right' },
		{ value: 'shake', label: 'Shake' },
		{ value: 'bounce', label: 'Bounce' },
		{ value: 'rotate', label: 'Wobble' },
		{ value: 'fade-in', label: 'Fade in' }
	];
}
