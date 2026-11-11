import type { Cookies } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';
import { db } from './db';
import { hashPassword, hmac, randomId, randomSlug, verifyPassword } from './crypto';
import { authSecret, siteUrl } from './settings';
import type { FileRecord, SessionUser, Share } from '$lib/types';

export interface CreateShareOptions {
	password?: string | null;
	expiresInHours?: number | null;
	maxViews?: number | null;
}

export function createShare(
	file: Pick<FileRecord, 'id'>,
	user: SessionUser | null,
	options: CreateShareOptions = {}
): Share {
	const id = randomId(10);
	let slug = randomSlug(7);
	while (db.prepare('SELECT 1 FROM shares WHERE slug = ?').get(slug)) slug = randomSlug(8);
	const passwordHash = options.password ? hashPassword(options.password) : null;
	const expiresAt =
		options.expiresInHours && options.expiresInHours > 0
			? Date.now() + options.expiresInHours * 60 * 60 * 1000
			: null;
	const maxViews = options.maxViews && options.maxViews > 0 ? Math.floor(options.maxViews) : null;
	db.prepare(
		`INSERT INTO shares (id, file_id, user_id, slug, password_hash, expires_at, max_views, views, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`
	).run(id, file.id, user?.id ?? null, slug, passwordHash, expiresAt, maxViews, Date.now());
	return getShareBySlug(slug)!;
}

export function getShareBySlug(slug: string): Share | null {
	return (db.prepare('SELECT * FROM shares WHERE slug = ?').get(slug) as Share | undefined) ?? null;
}

export function getShareById(id: string): Share | null {
	return (db.prepare('SELECT * FROM shares WHERE id = ?').get(id) as Share | undefined) ?? null;
}

export function sharesForFile(fileId: string): Share[] {
	return db.prepare('SELECT * FROM shares WHERE file_id = ? ORDER BY created_at DESC').all(fileId) as Share[];
}

export type SafeShare = Omit<Share, 'password_hash'> & { has_password: boolean };

export function listShares(
	userId: number
): (SafeShare & { original_name: string; mime: string })[] {
	const rows = db
		.prepare(
			`SELECT s.id, s.file_id, s.user_id, s.slug, s.password_hash, s.expires_at, s.max_views,
				s.views, s.created_at, f.original_name, f.mime
			 FROM shares s JOIN files f ON f.id = s.file_id
			 WHERE s.user_id = ? AND f.deleted_at IS NULL ORDER BY s.created_at DESC`
		)
		.all(userId) as (Share & { original_name: string; mime: string })[];
	return rows.map(({ password_hash, ...share }) => ({ ...share, has_password: !!password_hash }));
}

export function deleteShare(id: string, user: SessionUser): void {
	const share = getShareById(id);
	if (!share) return;
	if (user.role !== 'admin' && share.user_id !== user.id) throw error(403, 'You cannot revoke this share.');
	db.prepare('DELETE FROM shares WHERE id = ?').run(id);
}

export function isExpired(share: Share): boolean {
	if (share.expires_at && share.expires_at < Date.now()) return true;
	if (share.max_views !== null && share.views >= share.max_views) return true;
	return false;
}

export function shareUrl(slug: string, origin?: string): string {
	return `${siteUrl(origin)}/s/${slug}`;
}

function tokenFor(slug: string): string {
	return hmac(authSecret(), `share:${slug}`);
}

function cookieName(slug: string): string {
	return `share_${slug}`;
}

export function grantShareAccess(cookies: Cookies, slug: string): void {
	cookies.set(cookieName(slug), tokenFor(slug), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 6,
		secure: (process.env.ORIGIN ?? '').startsWith('https://')
	});
}

export function hasShareAccess(cookies: Cookies, share: Share): boolean {
	if (!share.password_hash) return true;
	const token = cookies.get(cookieName(share.slug));
	return !!token && token === tokenFor(share.slug);
}

export function checkSharePassword(share: Share, password: string): boolean {
	return verifyPassword(password, share.password_hash);
}

export function grantShareView(share: Share): void {
	db.prepare('UPDATE shares SET views = views + 1 WHERE id = ?').run(share.id);
}

export function pruneShares(): void {
	db.prepare('DELETE FROM shares WHERE expires_at IS NOT NULL AND expires_at < ?').run(Date.now());
	db.prepare('DELETE FROM shares WHERE max_views IS NOT NULL AND views >= max_views').run();
}
