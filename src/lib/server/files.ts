import { error } from '@sveltejs/kit';
import { db } from './db';
import { getSettings } from './settings';
import { randomId, secureFilename, sha256 } from './crypto';
import {
	compressImage,
	detectFile,
	IMAGE_EXTENSIONS,
	makeThumbnail,
	normalizeForBrowser,
	probeImage,
	stripMetadata
} from './media';
import { saveOriginal, saveThumbnail, removeStored } from './storage';
import { createNotification, storageUsed } from './auth';
import { visibilityFlags } from '$lib/visibility';
import type { FileRecord, FileWithMeta, SessionUser, Tag, Visibility } from '$lib/types';

type SqlValue = string | number | null;

export interface ProcessUploadOptions {
	buffer: Buffer;
	filename: string;
	userId: number | null;
	visibility?: Visibility;
	compress?: boolean;
	tags?: string;
}

export interface ProcessUploadResult {
	file: FileWithMeta;
	duplicate: boolean;
}

const MAX_NAME = 180;

export async function processUpload(options: ProcessUploadOptions): Promise<ProcessUploadResult> {
	const settings = getSettings();
	const { buffer } = options;

	if (!buffer || buffer.length === 0) throw error(400, 'The uploaded file is empty.');
	if (buffer.length > settings.maxUploadSize) {
		throw error(413, `File is larger than the ${Math.round(settings.maxUploadSize / (1024 * 1024))} MB limit.`);
	}

	const detected = await detectFile(buffer, options.filename);
	if (!settings.allowedExtensions.includes(detected.ext)) {
		throw error(415, `.${detected.ext} files are not allowed on this instance.`);
	}

	if (options.userId) {
		const user = db.prepare('SELECT storage_quota FROM users WHERE id = ?').get(options.userId) as
			| { storage_quota: number }
			| undefined;
		const quota = user?.storage_quota || settings.defaultQuota;
		if (quota > 0 && storageUsed(options.userId) + buffer.length > quota) {
			throw error(413, 'Storage quota exceeded. Delete some files or ask an administrator for more space.');
		}
	}

	const hash = sha256(buffer);
	const duplicateWhere =
		options.userId === null
			? 'hash = ? AND ext = ? AND user_id IS NULL AND is_public = 1 AND deleted_at IS NULL'
			: 'hash = ? AND ext = ? AND user_id = ? AND deleted_at IS NULL';
	const duplicateParams: SqlValue[] =
		options.userId === null ? [hash, detected.ext] : [hash, detected.ext, options.userId];
	const existing = db
		.prepare(`SELECT * FROM files WHERE ${duplicateWhere} ORDER BY created_at DESC LIMIT 1`)
		.get(...duplicateParams) as FileRecord | undefined;
	if (existing) {
		return { file: withCounts(existing), duplicate: true };
	}

	let content = buffer;
	let mime = detected.mime;
	const ext = detected.ext;

	// CMYK / high-bit-depth JPEGs can render as a blank box in some browsers.
	// Normalize those to sRGB while keeping the JPEG format.
	const normalized = await normalizeForBrowser(buffer, mime);
	if (normalized) content = normalized;

	if (options.compress && IMAGE_EXTENSIONS.has(ext) && !['gif', 'svg', 'ico'].includes(ext)) {
		const compressed = await compressImage(buffer, mime);
		if (compressed) content = compressed;
	} else if (settings.stripExif && IMAGE_EXTENSIONS.has(ext) && !['gif', 'svg', 'ico'].includes(ext)) {
		const stripped = await stripMetadata(buffer, mime);
		if (stripped) content = stripped;
	}

	const probe = detected.kind === 'image' ? await probeImage(content) : null;
	const thumb = await makeThumbnail(content, detected.kind);

	const id = randomId(12);
	const path = await saveOriginal(id, ext, content);
	const thumbPath = thumb ? await saveThumbnail(id, thumb) : null;
	const name = secureFilename(options.filename).slice(0, MAX_NAME) || `${id}.${ext}`;

	const visibility = options.visibility ?? settings.defaultVisibility;
	const flags = visibilityFlags(visibility);

	const record: FileRecord = {
		id,
		user_id: options.userId,
		original_name: name,
		ext,
		mime,
		size: content.length,
		width: probe?.width ?? null,
		height: probe?.height ?? null,
		pages: probe?.pages ?? 1,
		hash,
		path,
		thumb_path: thumbPath,
		is_public: flags.isPublic,
		listed: flags.listed,
		views: 0,
		downloads: 0,
		deleted_at: null,
		created_at: Date.now(),
		metadata: probe ? JSON.stringify(probe.metadata) : null
	};

	db.prepare(
		`INSERT INTO files (id, user_id, original_name, ext, mime, size, width, height, pages, hash, path, thumb_path, is_public, listed, views, downloads, deleted_at, created_at, metadata)
		 VALUES (@id, @user_id, @original_name, @ext, @mime, @size, @width, @height, @pages, @hash, @path, @thumb_path, @is_public, @listed, @views, @downloads, @deleted_at, @created_at, @metadata)`
	).run(record);

	if (options.tags) await attachTags(id, options.tags, options.userId);

	return { file: (await getFileDetail(id))!, duplicate: false };
}

export async function getFile(id: string): Promise<FileRecord | null> {
	const row = db.prepare('SELECT * FROM files WHERE id = ?').get(id) as FileRecord | undefined;
	return row ?? null;
}

export async function getFileDetail(id: string): Promise<FileWithMeta | null> {
	const row = db
		.prepare(
			`SELECT f.*, u.username, u.avatar_file_id,
				(SELECT COUNT(*) FROM likes l WHERE l.file_id = f.id) AS likes,
				(SELECT COUNT(*) FROM comments c WHERE c.file_id = f.id) AS comments
			 FROM files f LEFT JOIN users u ON u.id = f.user_id
			 WHERE f.id = ?`
		)
		.get(id) as FileWithMeta | undefined;
	if (!row) return null;
	row.tags = await tagsForFile(id);
	return row;
}

function withCounts(file: FileRecord): FileWithMeta {
	return { ...file, likes: 0, comments: 0 };
}

export function canView(file: FileRecord, user: SessionUser | null): boolean {
	if (file.deleted_at) return user?.role === 'admin';
	if (file.is_public) return true;
	if (!user) return false;
	return user.role === 'admin' || file.user_id === user.id;
}

export function canManage(file: FileRecord, user: SessionUser | null): boolean {
	if (!user) return false;
	return user.role === 'admin' || file.user_id === user.id;
}

export function touchView(id: string): void {
	db.prepare('UPDATE files SET views = views + 1 WHERE id = ?').run(id);
}

export function touchDownload(id: string): void {
	db.prepare('UPDATE files SET downloads = downloads + 1 WHERE id = ?').run(id);
}

export async function deleteFile(file: FileRecord, user: SessionUser): Promise<void> {
	if (!canManage(file, user)) throw error(403, 'You cannot delete this file.');
	db.prepare('UPDATE files SET deleted_at = ?, is_public = 0 WHERE id = ?').run(Date.now(), file.id);
	db.prepare('UPDATE users SET avatar_file_id = NULL WHERE avatar_file_id = ?').run(file.id);
	db.prepare('DELETE FROM shares WHERE file_id = ?').run(file.id);
	db.prepare('DELETE FROM reports WHERE file_id = ?').run(file.id);
	await removeStored(file.path);
	await removeStored(file.thumb_path);
}

export interface FileQuery {
	userId?: number | null;
	publicOnly?: boolean;
	publicAccess?: boolean;
	q?: string;
	tag?: string;
	kind?: 'image' | 'file';
	visibility?: Visibility;
	sort?: 'new' | 'old' | 'views' | 'size' | 'name';
	page?: number;
	perPage?: number;
	collectionId?: string;
	bookmarkedBy?: number;
	likedBy?: number;
	includeDeleted?: boolean;
}

export interface FilePage {
	files: FileWithMeta[];
	total: number;
	page: number;
	pages: number;
	perPage: number;
}

export async function listFiles(query: FileQuery = {}): Promise<FilePage> {
	const where: string[] = [];
	const params: SqlValue[] = [];

	if (!query.includeDeleted) where.push('f.deleted_at IS NULL');
	if (query.userId !== undefined && query.userId !== null) {
		where.push('f.user_id = ?');
		params.push(query.userId);
	}
	if (query.publicOnly) where.push('f.is_public = 1 AND f.listed = 1');
	if (query.publicAccess) where.push('f.is_public = 1');
	if (query.visibility === 'public') where.push('f.is_public = 1 AND f.listed = 1');
	if (query.visibility === 'unlisted') where.push('f.is_public = 1 AND f.listed = 0');
	if (query.visibility === 'private') where.push('f.is_public = 0');
	if (query.kind === 'image') where.push("f.mime LIKE 'image/%'");
	if (query.kind === 'file') where.push("f.mime NOT LIKE 'image/%'");
	if (query.q) {
		where.push('(f.original_name LIKE ? OR f.id LIKE ? OR f.mime LIKE ?)');
		const like = `%${query.q}%`;
		params.push(like, like, like);
	}
	if (query.tag) {
		where.push('EXISTS (SELECT 1 FROM file_tags ft JOIN tags t ON t.id = ft.tag_id WHERE ft.file_id = f.id AND t.slug = ?)');
		params.push(query.tag);
	}
	if (query.collectionId) {
		where.push('EXISTS (SELECT 1 FROM collection_files cf WHERE cf.collection_id = ? AND cf.file_id = f.id)');
		params.push(query.collectionId);
	}
	if (query.bookmarkedBy) {
		where.push('EXISTS (SELECT 1 FROM bookmarks b WHERE b.file_id = f.id AND b.user_id = ?)');
		params.push(query.bookmarkedBy);
	}
	if (query.likedBy) {
		where.push('EXISTS (SELECT 1 FROM likes l2 WHERE l2.file_id = f.id AND l2.user_id = ?)');
		params.push(query.likedBy);
	}

	const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
	const orderSql =
		{
			new: 'f.created_at DESC',
			old: 'f.created_at ASC',
			views: 'f.views DESC, f.created_at DESC',
			size: 'f.size DESC',
			name: 'f.original_name COLLATE NOCASE ASC'
		}[query.sort ?? 'new'] ?? 'f.created_at DESC';

	const perPage = Math.min(Math.max(query.perPage ?? 24, 1), 100);
	const total = (
		db.prepare(`SELECT COUNT(*) AS c FROM files f ${whereSql}`).get(...params) as { c: number }
	).c;
	const pages = Math.max(1, Math.ceil(total / perPage));
	const page = Math.min(Math.max(query.page ?? 1, 1), pages);

	const files = db
		.prepare(
			`SELECT f.*, u.username, u.avatar_file_id,
				(SELECT COUNT(*) FROM likes l WHERE l.file_id = f.id) AS likes,
				(SELECT COUNT(*) FROM comments c WHERE c.file_id = f.id) AS comments
			 FROM files f LEFT JOIN users u ON u.id = f.user_id
			 ${whereSql} ORDER BY ${orderSql} LIMIT ? OFFSET ?`
		)
		.all(...params, perPage, (page - 1) * perPage) as FileWithMeta[];

	await mergeTags(files);
	return { files, total, page, pages, perPage };
}

async function mergeTags(files: FileWithMeta[]): Promise<void> {
	if (!files.length) return;
	const ids = files.map((f) => f.id);
	const placeholders = ids.map(() => '?').join(',');
	const rows = db
		.prepare(
			`SELECT ft.file_id, t.* FROM file_tags ft JOIN tags t ON t.id = ft.tag_id WHERE ft.file_id IN (${placeholders})`
		)
		.all(...ids) as (Tag & { file_id: string })[];
	const map = new Map<string, Tag[]>();
	for (const row of rows) {
		const { file_id, ...tag } = row;
		const list = map.get(file_id) ?? [];
		list.push(tag);
		map.set(file_id, list);
	}
	for (const file of files) file.tags = map.get(file.id) ?? [];
}

export async function tagsForFile(fileId: string): Promise<Tag[]> {
	return db
		.prepare('SELECT t.* FROM tags t JOIN file_tags ft ON ft.tag_id = t.id WHERE ft.file_id = ? ORDER BY t.name')
		.all(fileId) as Tag[];
}

export async function attachTags(fileId: string, raw: string, userId: number | null): Promise<void> {
	if (!userId) return;
	const names = raw
		.split(',')
		.map((n) => n.trim())
		.filter(Boolean)
		.slice(0, 20);
	for (const name of names) {
		const slug = name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
			.slice(0, 40);
		if (!slug) continue;
		db.prepare(
			'INSERT INTO tags (user_id, name, slug, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id, slug) DO NOTHING'
		).run(userId, name.slice(0, 40), slug, Date.now());
		const tag = db.prepare('SELECT id FROM tags WHERE user_id = ? AND slug = ?').get(userId, slug) as
			| { id: number }
			| undefined;
		if (tag) {
			db.prepare('INSERT INTO file_tags (file_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING').run(
				fileId,
				tag.id
			);
		}
	}
}

export async function replaceTags(fileId: string, raw: string, userId: number): Promise<void> {
	db.prepare('DELETE FROM file_tags WHERE file_id = ?').run(fileId);
	await attachTags(fileId, raw, userId);
}

export function toggleLike(fileId: string, userId: number): boolean {
	const existing = db.prepare('SELECT 1 FROM likes WHERE file_id = ? AND user_id = ?').get(fileId, userId);
	if (existing) {
		db.prepare('DELETE FROM likes WHERE file_id = ? AND user_id = ?').run(fileId, userId);
		return false;
	}
	db.prepare('INSERT INTO likes (file_id, user_id, created_at) VALUES (?, ?, ?)').run(fileId, userId, Date.now());
	const file = db.prepare('SELECT id, user_id FROM files WHERE id = ?').get(fileId) as
		| { id: string; user_id: number }
		| undefined;
	if (file?.user_id && file.user_id !== userId) {
		createNotification(file.user_id, 'like', 'Someone liked your upload.', `/dashboard/images/${file.id}`);
	}
	return true;
}

export function toggleBookmark(fileId: string, userId: number): boolean {
	const existing = db
		.prepare('SELECT 1 FROM bookmarks WHERE file_id = ? AND user_id = ?')
		.get(fileId, userId);
	if (existing) {
		db.prepare('DELETE FROM bookmarks WHERE file_id = ? AND user_id = ?').run(fileId, userId);
		return false;
	}
	db.prepare('INSERT INTO bookmarks (file_id, user_id, created_at) VALUES (?, ?, ?)').run(fileId, userId, Date.now());
	return true;
}

export function addComment(fileId: string, userId: number, body: string): number {
	const trimmed = body.trim().slice(0, 2000);
	if (!trimmed) throw error(400, 'Comment cannot be empty.');
	const info = db
		.prepare('INSERT INTO comments (file_id, user_id, body, created_at) VALUES (?, ?, ?, ?)')
		.run(fileId, userId, trimmed, Date.now());
	const file = db.prepare('SELECT id, user_id FROM files WHERE id = ?').get(fileId) as
		| { id: string; user_id: number }
		| undefined;
	if (file?.user_id && file.user_id !== userId) {
		createNotification(file.user_id, 'comment', 'Someone commented on your upload.', `/dashboard/images/${file.id}`);
	}
	return Number(info.lastInsertRowid);
}

export function listComments(fileId: string) {
	return db
		.prepare(
			`SELECT c.*, u.username, u.avatar_file_id FROM comments c JOIN users u ON u.id = c.user_id
			 WHERE c.file_id = ? ORDER BY c.created_at ASC`
		)
		.all(fileId) as (import('$lib/types').Comment & { avatar_file_id: string | null })[];
}

export function userStats(userId: number) {
	const files = db
		.prepare(
			`SELECT COUNT(*) AS count, COALESCE(SUM(size), 0) AS size, COALESCE(SUM(views), 0) AS views
			 FROM files WHERE user_id = ? AND deleted_at IS NULL`
		)
		.get(userId) as { count: number; size: number; views: number };
	const shares = (
		db
			.prepare(
				`SELECT COUNT(*) AS c FROM shares s JOIN files f ON f.id = s.file_id
				 WHERE s.user_id = ? AND f.deleted_at IS NULL`
			)
			.get(userId) as { c: number }
	).c;
	const collections = (
		db.prepare('SELECT COUNT(*) AS c FROM collections WHERE user_id = ?').get(userId) as { c: number }
	).c;
	return { ...files, shares, collections };
}

export function siteStats() {
	const files = db
		.prepare(
			`SELECT COUNT(*) AS count, COALESCE(SUM(size), 0) AS size, COALESCE(SUM(views), 0) AS views
			 FROM files WHERE deleted_at IS NULL`
		)
		.get() as { count: number; size: number; views: number };
	const users = (db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c;
	const pending = (
		db.prepare("SELECT COUNT(*) AS c FROM users WHERE status = 'pending'").get() as { c: number }
	).c;
	const shares = (db.prepare('SELECT COUNT(*) AS c FROM shares').get() as { c: number }).c;
	const publicCount = (
		db.prepare('SELECT COUNT(*) AS c FROM files WHERE is_public = 1 AND listed = 1 AND deleted_at IS NULL').get() as {
			c: number;
		}
	).c;
	return { ...files, users, pending, shares, publicCount };
}

export function activity(userId: number | null, days = 14): { day: string; count: number; size: number }[] {
	const since = Date.now() - days * 24 * 60 * 60 * 1000;
	const params: SqlValue[] = [since];
	let sql = `SELECT date(created_at / 1000, 'unixepoch', 'localtime') AS day, COUNT(*) AS count, COALESCE(SUM(size),0) AS size
		FROM files WHERE deleted_at IS NULL AND created_at >= ?`;
	if (userId !== null) {
		sql += ' AND user_id = ?';
		params.push(userId);
	}
	sql += ' GROUP BY day ORDER BY day';
	const rows = db.prepare(sql).all(...params) as { day: string; count: number; size: number }[];
	const map = new Map(rows.map((r) => [r.day, r]));
	const out: { day: string; count: number; size: number }[] = [];
	for (let i = days - 1; i >= 0; i--) {
		const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
		const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
		const found = map.get(key);
		out.push({ day: key, count: found?.count ?? 0, size: found?.size ?? 0 });
	}
	return out;
}

export function popularTags(limit = 12): (Tag & { file_count: number })[] {
	return db
		.prepare(
			`SELECT t.*, COUNT(ft.file_id) AS file_count
			 FROM tags t JOIN file_tags ft ON ft.tag_id = t.id
			 JOIN files f ON f.id = ft.file_id AND f.is_public = 1 AND f.listed = 1 AND f.deleted_at IS NULL
			 GROUP BY t.id ORDER BY file_count DESC LIMIT ?`
		)
		.all(limit) as (Tag & { file_count: number })[];
}
