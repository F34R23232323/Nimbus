import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const row = db
		.prepare('SELECT target FROM short_links WHERE slug = ?')
		.get(params.code) as { target: string } | undefined;
	if (!row) throw error(404, 'Short link not found.');
	db.prepare('UPDATE short_links SET clicks = clicks + 1 WHERE slug = ?').run(params.code);

	return new Response(null, {
		status: 302,
		headers: {
			location: row.target,
			'cache-control': 'no-store'
		}
	});
};
