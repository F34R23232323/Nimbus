import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	db.prepare('SELECT 1').get();
	return json({
		ok: true,
		uptime: Math.round(process.uptime()),
		time: new Date().toISOString()
	});
};
