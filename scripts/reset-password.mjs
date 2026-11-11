import Database from 'better-sqlite3';
import { randomBytes, scryptSync } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const dataDir = resolve(process.cwd(), process.env.DATA_DIR || 'data');
const dbPath = resolve(dataDir, 'nimbus.db');

if (!existsSync(dbPath)) {
	console.error(`[reset-password] No database found at ${dbPath}`);
	console.error('[reset-password] Run this from the same directory you start the app from.');
	console.error(`[reset-password] Current working directory: ${process.cwd()}`);
	process.exit(1);
}

const db = new Database(dbPath);
db.pragma('busy_timeout = 3000');

const users = db
	.prepare('SELECT id, email, username, role, status FROM users ORDER BY id')
	.all();

const [identifier, password] = process.argv.slice(2);

if (!identifier) {
	console.log('[reset-password] Usage: npm run reset-password -- <email-or-username> <new-password>');
	console.table(users);
	db.close();
	process.exit(0);
}

if (!password || password.length < 8) {
	console.error('[reset-password] Provide a password with at least 8 characters.');
	console.error('[reset-password] Usage: npm run reset-password -- <email-or-username> <new-password>');
	db.close();
	process.exit(1);
}

const needle = identifier.toLowerCase();
const user = users.find(
	(candidate) =>
		candidate.email.toLowerCase() === needle || candidate.username.toLowerCase() === needle
);

if (!user) {
	console.error(`[reset-password] No user matches "${identifier}".`);
	console.table(users);
	db.close();
	process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const hash = scryptSync(password, salt, 64).toString('hex');
const stored = `scrypt:${salt}:${hash}`;

db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(stored, user.id);
db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
db.close();

console.log(`[reset-password] Password updated for @${user.username} <${user.email}>.`);
console.log('[reset-password] All existing sessions for that user were signed out.');
