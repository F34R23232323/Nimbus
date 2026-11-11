import { db } from './db';

export function logAudit(
	userId: number | null,
	action: string,
	meta?: Record<string, unknown> | string,
	ip?: string
): void {
	db.prepare('INSERT INTO audit_log (user_id, action, meta, ip, created_at) VALUES (?, ?, ?, ?, ?)').run(
		userId,
		action,
		meta ? (typeof meta === 'string' ? meta : JSON.stringify(meta)) : null,
		ip ?? null,
		Date.now()
	);
}

export function recentAudit(limit = 50) {
	return db
		.prepare(
			`SELECT a.*, u.username FROM audit_log a LEFT JOIN users u ON u.id = a.user_id
			 ORDER BY a.created_at DESC LIMIT ?`
		)
		.all(limit) as {
		id: number;
		user_id: number | null;
		action: string;
		meta: string | null;
		ip: string | null;
		created_at: number;
		username: string | null;
	}[];
}
