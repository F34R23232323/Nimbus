import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const ID_ALPHABET = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';

export function randomId(length = 12): string {
	const bytes = randomBytes(length);
	let out = '';
	for (let i = 0; i < length; i++) out += ID_ALPHABET[bytes[i] % ID_ALPHABET.length];
	return out;
}

export function randomSlug(length = 7): string {
	return randomId(length);
}

export function randomToken(bytes = 32): string {
	return randomBytes(bytes).toString('hex');
}

export function sha256(input: string | Buffer): string {
	return createHash('sha256').update(input).digest('hex');
}

export function hmac(secret: string, value: string): string {
	return createHmac('sha256', secret).update(value).digest('hex');
}

export function hashPassword(password: string): string {
	const salt = randomBytes(16).toString('hex');
	const hash = scryptSync(password, salt, 64).toString('hex');
	return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
	if (!stored) return false;
	const parts = stored.split(':');
	if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
	const [, salt, hash] = parts;
	try {
		const candidate = scryptSync(password, salt, 64);
		const expected = Buffer.from(hash, 'hex');
		return candidate.length === expected.length && timingSafeEqual(candidate, expected);
	} catch {
		return false;
	}
}

export function safeEqual(a: string, b: string): boolean {
	const ba = Buffer.from(a);
	const bb = Buffer.from(b);
	if (ba.length !== bb.length) return false;
	return timingSafeEqual(ba, bb);
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
	const key = `nmb_${randomBytes(24).toString('hex')}`;
	return { key, prefix: key.slice(0, 12), hash: sha256(key) };
}

export function secureFilename(name: string): string {
	const cleaned = name
		.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
	return (cleaned || 'file').slice(0, 180);
}
