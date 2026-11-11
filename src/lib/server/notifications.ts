import { db } from './db';
import type { Notification } from '$lib/types';

export function unreadCount(userId: number): number {
	const row = db
		.prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read = 0')
		.get(userId) as { c: number };
	return row?.c ?? 0;
}

export function listNotifications(userId: number, limit = 50): Notification[] {
	return db
		.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
		.all(userId, limit) as Notification[];
}

export function markRead(userId: number, id?: number): void {
	if (id) {
		db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(id, userId);
	} else {
		db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(userId);
	}
}

export function removeNotification(userId: number, id: number): void {
	db.prepare('DELETE FROM notifications WHERE id = ? AND user_id = ?').run(id, userId);
}
