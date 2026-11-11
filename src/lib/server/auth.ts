import type { Cookies } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { db } from './db';
import { getSettings } from './settings';
import { randomToken, safeEqual, sha256 } from './crypto';
import type { ApiKey, SessionUser, User } from '$lib/types';

export const SESSION_COOKIE = 'nimbus_session';
export const SESSION_TTL = 1000 * 60 * 60 * 24 * 30;

interface UserRow extends User {
	password_hash: string;
}

export function publicUser(row: UserRow): SessionUser {
	return {
		id: row.id,
		email: row.email,
		username: row.username,
		role: row.role,
		status: row.status,
		bio: row.bio,
		avatar_file_id: row.avatar_file_id,
		storage_quota: row.storage_quota,
		created_at: row.created_at,
		avatar_url: row.avatar_file_id ? `/t/${row.avatar_file_id}` : null,
		storage_used: storageUsed(row.id)
	};
}

export function getUserById(id: number): SessionUser | null {
	const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
	return row ? publicUser(row) : null;
}

export function getUserByUsername(username: string): SessionUser | null {
	const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined;
	return row ? publicUser(row) : null;
}

export function getUserRowByEmail(email: string): UserRow | undefined {
	return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
}

export function storageUsed(userId: number): number {
	const row = db
		.prepare('SELECT COALESCE(SUM(size), 0) AS total FROM files WHERE user_id = ? AND deleted_at IS NULL')
		.get(userId) as { total: number };
	return row?.total ?? 0;
}

export function createSession(userId: number, ip?: string | null, userAgent?: string | null): string {
	const id = randomToken(32);
	const createdAt = Date.now();
	db.prepare(
		'INSERT INTO sessions (id, user_id, created_at, expires_at, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?)'
	).run(id, userId, createdAt, createdAt + SESSION_TTL, ip ?? null, userAgent?.slice(0, 400) ?? null);
	return id;
}

export function destroySession(id: string): void {
	db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

export function userFromSession(sessionId: string | undefined): SessionUser | null {
	if (!sessionId) return null;
	const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as
		| { id: string; user_id: number; expires_at: number }
		| undefined;
	if (!session) return null;
	if (session.expires_at < Date.now()) {
		destroySession(session.id);
		return null;
	}
	const user = getUserById(session.user_id);
	if (!user || user.status === 'banned') return null;
	return user;
}

export function setSessionCookie(cookies: Cookies, sessionId: string): void {
	cookies.set(SESSION_COOKIE, sessionId, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: SESSION_TTL / 1000,
		secure: (process.env.ORIGIN ?? '').startsWith('https://')
	});
}

export function clearSessionCookie(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

export function userFromApiKey(rawKey: string): SessionUser | null {
	if (!rawKey || !rawKey.startsWith('nmb_')) return null;
	const row = db.prepare('SELECT * FROM api_keys WHERE key_hash = ?').get(sha256(rawKey)) as
		| (ApiKey & { key_hash: string })
		| undefined;
	if (!row) return null;
	db.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?').run(Date.now(), row.id);
	const user = getUserById(row.user_id);
	if (!user || user.status === 'banned') return null;
	return user;
}

export function userFromBotSecret(secret: string | null): SessionUser | null {
	if (!secret) return null;
	const settings = getSettings();
	if (!settings.botSecret || !safeEqual(secret, settings.botSecret)) return null;
	if (settings.botOwnerId) {
		const owner = getUserById(settings.botOwnerId);
		if (owner && owner.status !== 'banned') return owner;
	}
	const admin = db
		.prepare("SELECT id FROM users WHERE role = 'admin' AND status = 'active' ORDER BY id LIMIT 1")
		.get() as { id: number } | undefined;
	return admin ? getUserById(admin.id) : null;
}

export interface Authenticated {
	user: SessionUser | null;
	via: 'session' | 'api-key' | 'bot' | null;
	sessionId: string | null;
}

export function authenticateRequest(
	cookies: Cookies,
	request: Request
): Authenticated {
	const header = request.headers.get('authorization');
	if (header?.toLowerCase().startsWith('bearer ')) {
		const user = userFromApiKey(header.slice(7).trim());
		if (user) return { user, via: 'api-key', sessionId: null };
	}
	const botSecret = request.headers.get('x-bot-secret');
	if (botSecret) {
		const user = userFromBotSecret(botSecret);
		if (user) return { user, via: 'bot', sessionId: null };
	}
	const sessionId = cookies.get(SESSION_COOKIE) ?? null;
	const user = userFromSession(sessionId ?? undefined);
	return { user, via: user ? 'session' : null, sessionId: user ? sessionId : null };
}

export function requireUser(user: SessionUser | null): SessionUser {
	if (!user) throw error(401, 'You need to sign in to do that.');
	return user;
}

export function requireAdmin(user: SessionUser | null): SessionUser {
	if (!user) throw error(401, 'Sign in to continue.');
	if (user.role !== 'admin') throw error(403, 'Administrator access required.');
	return user;
}

export function assertCanUpload(user: SessionUser | null): SessionUser {
	const settings = getSettings();
	if (!user) throw error(401, 'Sign in to upload files.');
	if (settings.maintenance && user.role !== 'admin') {
		throw error(503, 'The instance is in maintenance mode. Uploads are temporarily paused.');
	}
	if (user.status === 'banned') throw error(403, 'Your account has been suspended.');
	if (user.status === 'pending') throw error(403, 'Your account is awaiting approval.');
	return user;
}

export function createNotification(
	userId: number,
	type: string,
	message: string,
	link?: string | null
): void {
	db.prepare(
		'INSERT INTO notifications (user_id, type, message, link, created_at) VALUES (?, ?, ?, ?, ?)'
	).run(userId, type, message, link ?? null, Date.now());
}

export function listApiKeys(userId: number): ApiKey[] {
	return db
		.prepare(
			'SELECT id, user_id, name, prefix, created_at, last_used_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC'
		)
		.all(userId) as ApiKey[];
}
