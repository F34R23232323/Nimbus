import { error } from '@sveltejs/kit';
import { db } from './db';
import type { Tag } from '$lib/types';

export function listTags(userId: number): (Tag & { file_count: number; parent_name: string | null })[] {
	return db
		.prepare(
			`SELECT t.*, p.name AS parent_name,
				(SELECT COUNT(*) FROM file_tags ft JOIN files f ON f.id = ft.file_id
				 WHERE ft.tag_id = t.id AND f.deleted_at IS NULL) AS file_count
			 FROM tags t LEFT JOIN tags p ON p.id = t.parent_id
			 WHERE t.user_id = ? ORDER BY t.name`
		)
		.all(userId) as (Tag & { file_count: number; parent_name: string | null })[];
}

export function createTag(
	userId: number,
	name: string,
	parentId: number | null = null,
	color = ''
): Tag {
	const clean = name.trim().slice(0, 40);
	if (!clean) throw error(400, 'Tag name is required.');
	const slug = clean
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
	if (!slug) throw error(400, 'Tag name needs at least one letter or number.');

	if (parentId) {
		const parent = db.prepare('SELECT id FROM tags WHERE id = ? AND user_id = ?').get(parentId, userId);
		if (!parent) throw error(400, 'Parent tag not found.');
	}

	db.prepare(
		'INSERT INTO tags (user_id, name, slug, parent_id, color, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, slug) DO NOTHING'
	).run(userId, clean, slug, parentId, color, Date.now());
	const tag = db.prepare('SELECT * FROM tags WHERE user_id = ? AND slug = ?').get(userId, slug) as Tag;
	return tag;
}

export function updateTag(
	id: number,
	userId: number,
	patch: { name?: string; color?: string; parentId?: number | null }
): Tag {
	const existing = db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?').get(id, userId) as
		| Tag
		| undefined;
	if (!existing) throw error(404, 'Tag not found.');

	let name = existing.name;
	let slug = existing.slug;
	if (patch.name !== undefined) {
		name = patch.name.trim().slice(0, 40);
		if (!name) throw error(400, 'Tag name is required.');
		slug = name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');
	}
	const parentId = patch.parentId === undefined ? existing.parent_id : patch.parentId;
	if (parentId === id) throw error(400, 'A tag cannot be its own parent.');
	if (parentId) {
		const parent = db.prepare('SELECT id FROM tags WHERE id = ? AND user_id = ?').get(parentId, userId);
		if (!parent) throw error(400, 'Parent tag not found.');
	}
	db.prepare(
		'UPDATE tags SET name = ?, slug = ?, color = ?, parent_id = ? WHERE id = ? AND user_id = ?'
	).run(name, slug, patch.color ?? existing.color, parentId, id, userId);
	return db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as Tag;
}

export function deleteTag(id: number, userId: number): void {
	db.prepare('UPDATE tags SET parent_id = NULL WHERE parent_id = ? AND user_id = ?').run(id, userId);
	db.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').run(id, userId);
}

export function tagSuggestions(userId: number, q: string): Tag[] {
	return db
		.prepare('SELECT * FROM tags WHERE user_id = ? AND name LIKE ? ORDER BY name LIMIT 8')
		.all(userId, `%${q}%`) as Tag[];
}
