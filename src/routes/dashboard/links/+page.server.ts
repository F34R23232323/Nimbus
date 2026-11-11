import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { randomId, randomSlug } from '$lib/server/crypto';
import { siteUrl } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) throw redirect(303, '/login?next=/dashboard/links');
	const links = db
		.prepare('SELECT * FROM short_links WHERE user_id = ? ORDER BY created_at DESC')
		.all(locals.user!.id) as {
		id: string;
		slug: string;
		target: string;
		clicks: number;
		created_at: number;
	}[];
	return { links, base: siteUrl(url.origin) };
};

export const actions: Actions = {
	create: async ({ request, locals, url }) => {
		const form = await request.formData();
		const target = String(form.get('target') ?? '').trim();
		const custom = String(form.get('slug') ?? '')
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9-]/g, '')
			.slice(0, 40);

		if (!/^https?:\/\/[^\s]+$/i.test(target)) {
			return fail(400, { error: 'Enter a valid URL starting with http:// or https://' });
		}
		if (custom && custom.length < 2) return fail(400, { error: 'Custom slug needs at least 2 characters.' });
		if (custom && db.prepare('SELECT 1 FROM short_links WHERE slug = ?').get(custom)) {
			return fail(409, { error: 'That slug is already taken.' });
		}

		let slug = custom || randomSlug(6).toLowerCase();
		if (!custom) {
			while (db.prepare('SELECT 1 FROM short_links WHERE slug = ?').get(slug)) slug = randomSlug(7).toLowerCase();
		}

		db.prepare(
			'INSERT INTO short_links (id, user_id, slug, target, clicks, created_at) VALUES (?, ?, ?, ?, 0, ?)'
		).run(randomId(10), locals.user!.id, slug, target, Date.now());
		return { success: `Created ${siteUrl(url.origin)}/short/${slug}` };
	},

	delete: async ({ request, locals }) => {
		const id = String((await request.formData()).get('id') ?? '');
		db.prepare('DELETE FROM short_links WHERE id = ? AND user_id = ?').run(id, locals.user!.id);
		return { success: 'Short link deleted.' };
	}
};
