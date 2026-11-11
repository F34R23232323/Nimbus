import { error, json } from '@sveltejs/kit';
import { httpErrorDetails } from '$lib/server/httpError';
import { db } from '$lib/server/db';
import { randomId, randomSlug } from '$lib/server/crypto';
import { requireUser } from '$lib/server/auth';
import { siteUrl } from '$lib/server/settings';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals, url }) => {
	try {
		const user = requireUser(locals.user);
		const body = (await request.json().catch(() => ({}))) as { target?: string; slug?: string };
		const target = String(body.target ?? '').trim();
		if (!/^https?:\/\/[^\s]+$/i.test(target)) throw error(400, 'Enter a valid http(s) URL.');

		let slug = String(body.slug ?? '')
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9-]/g, '')
			.slice(0, 40);
		if (slug && slug.length < 2) throw error(400, 'Custom slugs need at least 2 characters.');
		if (slug && db.prepare('SELECT 1 FROM short_links WHERE slug = ?').get(slug)) {
			throw error(409, 'That slug is already taken.');
		}
		if (!slug) {
			slug = randomSlug(6).toLowerCase();
			while (db.prepare('SELECT 1 FROM short_links WHERE slug = ?').get(slug)) {
				slug = randomSlug(7).toLowerCase();
			}
		}

		db.prepare(
			'INSERT INTO short_links (id, user_id, slug, target, clicks, created_at) VALUES (?, ?, ?, ?, 0, ?)'
		).run(randomId(10), user.id, slug, target, Date.now());

		const shortUrl = `${siteUrl(url.origin)}/short/${slug}`;
		return json({ ok: true, slug, url: shortUrl, target });
	} catch (err) {
		const httpError = httpErrorDetails(err);
		if (httpError) return json({ ok: false, error: httpError.message }, { status: httpError.status });
		console.error('[nimbus] short link error', err);
		return json({ ok: false, error: 'Could not create short link.' }, { status: 500 });
	}
};
