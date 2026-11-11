import { error } from '@sveltejs/kit';
import { db } from './db';
import { randomId } from './crypto';
import { visibilityFlags } from '$lib/visibility';
import type { Collection, FileWithMeta, Visibility } from '$lib/types';

function decoratePaths(collections: Collection[]): Collection[] {
	const byId = new Map(collections.map((collection) => [collection.id, collection]));
	for (const collection of collections) {
		const names: string[] = [];
		const seen = new Set<string>();
		let cursor: Collection | undefined = collection;
		while (cursor && !seen.has(cursor.id)) {
			seen.add(cursor.id);
			names.unshift(cursor.name);
			cursor = cursor.parent_id ? byId.get(cursor.parent_id) : undefined;
		}
		collection.path = names.join(' / ');
	}
	return collections;
}

export function listCollections(userId: number, rootsOnly = false): Collection[] {
	const collections = db
		.prepare(
			`SELECT c.*, (SELECT COUNT(*) FROM collection_files cf JOIN files f ON f.id = cf.file_id
				WHERE cf.collection_id = c.id AND f.deleted_at IS NULL) AS file_count,
				(SELECT COUNT(*) FROM collections child WHERE child.parent_id = c.id) AS child_count,
				(SELECT GROUP_CONCAT(f.id, ',') FROM collection_files cf JOIN files f ON f.id = cf.file_id
					WHERE cf.collection_id = c.id AND f.deleted_at IS NULL AND f.mime LIKE 'image/%') AS preview_ids
			 FROM collections c WHERE c.user_id = ?${rootsOnly ? ' AND c.parent_id IS NULL' : ''}
			 ORDER BY c.created_at DESC`
		)
		.all(userId) as Collection[];
	return decoratePaths(collections);
}

export function getCollection(id: string): Collection | null {
	return (
		(db.prepare('SELECT * FROM collections WHERE id = ?').get(id) as Collection | undefined) ?? null
	);
}

export function getCollectionBySlug(slug: string): Collection | null {
	return (
		(db.prepare('SELECT * FROM collections WHERE slug = ?').get(slug) as Collection | undefined) ?? null
	);
}

export function createCollection(
	userId: number,
	name: string,
	description = '',
	visibility: Visibility = 'public',
	parentId: string | null = null
): Collection {
	const clean = name.trim().slice(0, 80);
	if (!clean) throw error(400, 'Collection name is required.');
	if (parentId) {
		const parent = getCollection(parentId);
		if (!parent) throw error(404, 'Parent collection not found.');
		if (parent.user_id !== userId) throw error(403, 'You cannot add a folder here.');
	}
	const id = randomId(10);
	const flags = visibilityFlags(visibility);
	const slug = `${clean
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 32)}-${randomId(4).toLowerCase()}`;
	db.prepare(
		'INSERT INTO collections (id, user_id, parent_id, name, description, slug, is_public, listed, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
	).run(
		id,
		userId,
		parentId,
		clean,
		description.slice(0, 300),
		slug,
		flags.isPublic,
		flags.listed,
		Date.now()
	);
	return getCollection(id)!;
}

export function listChildCollections(
	parentId: string,
	options: { publicOnly?: boolean } = {}
): Collection[] {
	return db
		.prepare(
			`SELECT c.*, (SELECT COUNT(*) FROM collection_files cf JOIN files f ON f.id = cf.file_id
				WHERE cf.collection_id = c.id AND f.deleted_at IS NULL${options.publicOnly ? ' AND f.is_public = 1' : ''}) AS file_count,
				(SELECT COUNT(*) FROM collections child WHERE child.parent_id = c.id) AS child_count,
				(SELECT GROUP_CONCAT(f.id, ',') FROM collection_files cf JOIN files f ON f.id = cf.file_id
					WHERE cf.collection_id = c.id AND f.deleted_at IS NULL AND f.mime LIKE 'image/%'${options.publicOnly ? ' AND f.is_public = 1' : ''}) AS preview_ids
			 FROM collections c WHERE c.parent_id = ?${options.publicOnly ? ' AND c.is_public = 1 AND c.listed = 1' : ''}
			 ORDER BY c.name COLLATE NOCASE ASC`
		)
		.all(parentId) as Collection[];
}

export function collectionAncestors(id: string): Collection[] {
	const ancestors: Collection[] = [];
	const seen = new Set<string>([id]);
	let current = getCollection(id);
	while (current?.parent_id) {
		if (seen.has(current.parent_id)) break;
		const parent = getCollection(current.parent_id);
		if (!parent) break;
		seen.add(parent.id);
		ancestors.unshift(parent);
		current = parent;
	}
	return ancestors;
}

export function updateCollection(
	id: string,
	userId: number,
	patch: { name?: string; description?: string; visibility?: Visibility }
): void {
	const collection = getCollection(id);
	if (!collection) throw error(404, 'Collection not found.');
	if (collection.user_id !== userId) throw error(403, 'You cannot edit this collection.');
	const name = patch.name?.trim().slice(0, 80) || collection.name;
	const description =
		patch.description === undefined ? collection.description : patch.description.slice(0, 300);
	const flags = patch.visibility
		? visibilityFlags(patch.visibility)
		: { isPublic: collection.is_public, listed: collection.listed };
	db.prepare(
		'UPDATE collections SET name = ?, description = ?, is_public = ?, listed = ? WHERE id = ?'
	).run(name, description, flags.isPublic, flags.listed, id);
}

export function deleteCollection(id: string, userId: number): void {
	const collection = getCollection(id);
	if (!collection || collection.user_id !== userId) return;
	db.prepare(
		`WITH RECURSIVE descendants(id) AS (
			SELECT id FROM collections WHERE id = ?
			UNION ALL
			SELECT c.id FROM collections c JOIN descendants d ON c.parent_id = d.id
		)
		DELETE FROM collections WHERE id IN (SELECT id FROM descendants)`
	).run(id);
}

export function collectionFiles(collectionId: string): FileWithMeta[] {
	return db
		.prepare(
			`SELECT f.*, u.username, cf.position FROM collection_files cf
			 JOIN files f ON f.id = cf.file_id LEFT JOIN users u ON u.id = f.user_id
			 WHERE cf.collection_id = ? AND f.deleted_at IS NULL ORDER BY cf.position ASC, f.created_at DESC`
		)
		.all(collectionId) as FileWithMeta[];
}

export function resolveUploadCollection(
	userId: number,
	options: { id?: string | null; name?: string | null }
): string | null {
	const id = String(options.id ?? '').trim();
	if (id) {
		const existing = db
			.prepare('SELECT id FROM collections WHERE id = ? AND user_id = ?')
			.get(id, userId) as { id: string } | undefined;
		if (!existing) throw error(403, 'The selected collection does not belong to you.');
		return existing.id;
	}

	const name = String(options.name ?? '').trim().slice(0, 80);
	if (!name) return null;

	const existing = db
		.prepare('SELECT id FROM collections WHERE user_id = ? AND parent_id IS NULL AND lower(name) = lower(?)')
		.get(userId, name) as { id: string } | undefined;
	if (existing) return existing.id;

	return createCollection(userId, name, 'Created automatically by uploads.', 'private').id;
}

export function addFile(collectionId: string, fileId: string, userId: number): void {
	const collection = getCollection(collectionId);
	if (!collection || collection.user_id !== userId) throw error(403, 'Collection not found.');
	const file = db.prepare('SELECT id, user_id FROM files WHERE id = ? AND deleted_at IS NULL').get(fileId) as
		| { id: string; user_id: number | null }
		| undefined;
	if (!file || file.user_id !== userId) throw error(404, 'File not found.');
	const pos = (
		db.prepare('SELECT COALESCE(MAX(position), 0) + 1 AS p FROM collection_files WHERE collection_id = ?').get(
			collectionId
		) as { p: number }
	).p;
	db.prepare(
		'INSERT INTO collection_files (collection_id, file_id, position) VALUES (?, ?, ?) ON CONFLICT DO NOTHING'
	).run(collectionId, fileId, pos);
	if (!collection.cover_file_id) {
		db.prepare('UPDATE collections SET cover_file_id = ? WHERE id = ?').run(fileId, collectionId);
	}
}

export function removeFile(collectionId: string, fileId: string, userId: number): void {
	const collection = getCollection(collectionId);
	if (!collection || collection.user_id !== userId) throw error(403, 'Collection not found.');
	db.prepare('DELETE FROM collection_files WHERE collection_id = ? AND file_id = ?').run(collectionId, fileId);
	if (collection.cover_file_id === fileId) {
		const next = db
			.prepare('SELECT file_id FROM collection_files WHERE collection_id = ? ORDER BY position LIMIT 1')
			.get(collectionId) as { file_id: string } | undefined;
		db.prepare('UPDATE collections SET cover_file_id = ? WHERE id = ?').run(next?.file_id ?? null, collectionId);
	}
}

export function publicCollections(limit = 12): (Collection & { username: string | null })[] {
	return db
		.prepare(
			`SELECT c.*, u.username,
				(SELECT COUNT(*) FROM collection_files cf JOIN files f ON f.id = cf.file_id
				 WHERE cf.collection_id = c.id AND f.is_public = 1 AND f.deleted_at IS NULL) AS file_count
			 FROM collections c LEFT JOIN users u ON u.id = c.user_id
			 WHERE c.is_public = 1 AND c.listed = 1 AND c.parent_id IS NULL ORDER BY c.created_at DESC LIMIT ?`
		)
		.all(limit) as (Collection & { username: string | null })[];
}
