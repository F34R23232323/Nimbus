import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	addComment,
	canView,
	getFileDetail,
	listComments,
	listFiles,
	toggleBookmark,
	toggleLike
} from '$lib/server/files';
import { getSettings } from '$lib/server/settings';
import { fileAbsoluteUrl } from '$lib/server/urls';
import type { FileWithMeta } from '$lib/types';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const file = await getFileDetail(params.id);
	if (!file || file.deleted_at || !canView(file, locals.user)) {
		throw error(404, 'This file does not exist or is private.');
	}

	const user = locals.user;
	const settings = getSettings();
	const liked = user
		? !!db.prepare('SELECT 1 FROM likes WHERE file_id = ? AND user_id = ?').get(file.id, user.id)
		: false;
	const bookmarked = user
		? !!db.prepare('SELECT 1 FROM bookmarks WHERE file_id = ? AND user_id = ?').get(file.id, user.id)
		: false;

	const comments =
		settings.commentsEnabled && file.is_public === 1 ? listComments(file.id) : [];

	let related: FileWithMeta[] = [];
	if (file.is_public) {
		const recent = await listFiles({ publicOnly: true, perPage: 8, sort: 'new', kind: 'image' });
		related = recent.files.filter((other) => other.id !== file.id).slice(0, 6);
	}

	return {
		file,
		liked,
		bookmarked,
		comments,
		commentsEnabled: settings.commentsEnabled,
		isOwner: user?.id === file.user_id,
		canManage: !!user && (user.role === 'admin' || user.id === file.user_id),
		directUrl: fileAbsoluteUrl(file, url.origin),
		related
	};
};

async function ensureViewable(id: string, user: App.Locals['user']) {
	const file = await getFileDetail(id);
	if (!file || file.deleted_at || !canView(file, user)) throw error(404, 'File not found.');
	return file;
}

export const actions: Actions = {
	like: async ({ params, locals }) => {
		if (!locals.user) return fail(401, { error: 'Sign in to like files.' });
		const file = await ensureViewable(params.id, locals.user);
		const liked = toggleLike(file.id, locals.user.id);
		return { liked, message: liked ? 'Added to likes' : 'Removed from likes' };
	},

	bookmark: async ({ params, locals }) => {
		if (!locals.user) return fail(401, { error: 'Sign in to bookmark files.' });
		const file = await ensureViewable(params.id, locals.user);
		const bookmarked = toggleBookmark(file.id, locals.user.id);
		return { bookmarked, message: bookmarked ? 'Saved to bookmarks' : 'Removed from bookmarks' };
	},

	comment: async ({ params, locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Sign in to comment.' });
		const settings = getSettings();
		if (!settings.commentsEnabled) return fail(403, { error: 'Comments are disabled.' });
		const file = await ensureViewable(params.id, locals.user);
		if (!file.is_public) return fail(403, { error: 'Comments are only available on public files.' });
		const body = String((await request.formData()).get('body') ?? '');
		if (!body.trim()) return fail(400, { error: 'Write something first.' });
		addComment(file.id, locals.user.id, body);
		return { commentSuccess: true };
	},

	deleteComment: async ({ params, locals, request }) => {
		if (!locals.user) return fail(401, { error: 'Sign in to continue.' });
		const id = Number((await request.formData()).get('commentId'));
		const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(id) as
			| { id: number; user_id: number; file_id: string }
			| undefined;
		if (!comment || comment.file_id !== params.id) return fail(404, { error: 'Comment not found.' });
		if (comment.user_id !== locals.user.id && locals.user.role !== 'admin') {
			return fail(403, { error: 'You cannot delete that comment.' });
		}
		db.prepare('DELETE FROM comments WHERE id = ?').run(id);
		return { commentDeleted: true };
	},

	report: async ({ params, locals, request }) => {
		const file = await ensureViewable(params.id, locals.user);
		const reason = String((await request.formData()).get('reason') ?? '').slice(0, 500);
		if (!reason.trim()) return fail(400, { error: 'Tell us what is wrong with this file.' });
		db.prepare(
			'INSERT INTO reports (file_id, reporter_id, reason, created_at) VALUES (?, ?, ?, ?)'
		).run(file.id, locals.user?.id ?? null, reason.trim(), Date.now());
		return { reported: true };
	}
};
