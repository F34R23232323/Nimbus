import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';

export const DATA_DIR = resolve(process.cwd(), process.env.DATA_DIR || 'data');
export const FILES_DIR = join(DATA_DIR, 'files');
export const THUMBS_DIR = join(DATA_DIR, 'thumbs');

export async function ensureStorage(): Promise<void> {
	await mkdir(FILES_DIR, { recursive: true });
	await mkdir(THUMBS_DIR, { recursive: true });
}

export function toAbsolute(relativePath: string): string {
	const full = resolve(DATA_DIR, relativePath);
	if (full !== DATA_DIR && !full.startsWith(DATA_DIR + sep)) {
		throw new Error('Path escapes the data directory');
	}
	return full;
}

export async function saveOriginal(id: string, ext: string, buffer: Buffer): Promise<string> {
	const shard = id.slice(0, 2);
	const relative = join('files', shard, `${id}.${ext}`);
	const full = toAbsolute(relative);
	await mkdir(dirname(full), { recursive: true });
	await writeFile(full, buffer);
	return relative;
}

export async function saveThumbnail(id: string, buffer: Buffer): Promise<string> {
	await mkdir(THUMBS_DIR, { recursive: true });
	const relative = join('thumbs', `${id}.webp`);
	await writeFile(toAbsolute(relative), buffer);
	return relative;
}

export async function readStored(relativePath: string): Promise<Buffer | null> {
	try {
		return await readFile(toAbsolute(relativePath));
	} catch {
		return null;
	}
}

export async function storedExists(relativePath: string | null): Promise<boolean> {
	if (!relativePath) return false;
	try {
		const info = await stat(toAbsolute(relativePath));
		return info.isFile();
	} catch {
		return false;
	}
}

export async function removeStored(relativePath: string | null): Promise<void> {
	if (!relativePath) return;
	try {
		await rm(toAbsolute(relativePath), { force: true });
	} catch {
		// ignore
	}
}
