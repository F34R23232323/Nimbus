import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { hashPassword, randomToken } from './crypto';

const dataDir = resolve(process.cwd(), process.env.DATA_DIR || 'data');
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

export const DB_PATH = resolve(dataDir, 'nimbus.db');

const globalForDb = globalThis as unknown as { __nimbusDb?: Database.Database };

function open(): Database.Database {
	const instance = new Database(DB_PATH);
	instance.pragma('journal_mode = WAL');
	instance.pragma('synchronous = NORMAL');
	instance.pragma('foreign_keys = ON');
	instance.pragma('busy_timeout = 5000');
	return instance;
}

export const db: Database.Database = globalForDb.__nimbusDb ?? open();
if (process.env.NODE_ENV !== 'production') globalForDb.__nimbusDb = db;

const schema = `
CREATE TABLE IF NOT EXISTS users (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	email TEXT NOT NULL UNIQUE COLLATE NOCASE,
	username TEXT NOT NULL UNIQUE COLLATE NOCASE,
	password_hash TEXT NOT NULL,
	role TEXT NOT NULL DEFAULT 'user',
	status TEXT NOT NULL DEFAULT 'active',
	bio TEXT NOT NULL DEFAULT '',
	avatar_file_id TEXT,
	storage_quota INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
	id TEXT PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	created_at INTEGER NOT NULL,
	expires_at INTEGER NOT NULL,
	ip TEXT,
	user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS files (
	id TEXT PRIMARY KEY,
	user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
	original_name TEXT NOT NULL,
	ext TEXT NOT NULL,
	mime TEXT NOT NULL,
	size INTEGER NOT NULL,
	width INTEGER,
	height INTEGER,
	pages INTEGER NOT NULL DEFAULT 1,
	hash TEXT NOT NULL,
	path TEXT NOT NULL,
	thumb_path TEXT,
	is_public INTEGER NOT NULL DEFAULT 1,
	listed INTEGER NOT NULL DEFAULT 1,
	views INTEGER NOT NULL DEFAULT 0,
	downloads INTEGER NOT NULL DEFAULT 0,
	deleted_at INTEGER,
	created_at INTEGER NOT NULL,
	metadata TEXT
);
CREATE INDEX IF NOT EXISTS idx_files_user ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_public ON files(is_public, created_at);
CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash);
CREATE INDEX IF NOT EXISTS idx_files_created ON files(created_at);

CREATE TABLE IF NOT EXISTS shares (
	id TEXT PRIMARY KEY,
	file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
	user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
	slug TEXT NOT NULL UNIQUE,
	password_hash TEXT,
	expires_at INTEGER,
	max_views INTEGER,
	views INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shares_file ON shares(file_id);

CREATE TABLE IF NOT EXISTS collections (
	id TEXT PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	parent_id TEXT REFERENCES collections(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	description TEXT NOT NULL DEFAULT '',
	slug TEXT NOT NULL UNIQUE,
	is_public INTEGER NOT NULL DEFAULT 1,
	listed INTEGER NOT NULL DEFAULT 1,
	cover_file_id TEXT,
	created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS collection_files (
	collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
	file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
	position INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (collection_id, file_id)
);

CREATE TABLE IF NOT EXISTS tags (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	slug TEXT NOT NULL,
	parent_id INTEGER REFERENCES tags(id) ON DELETE SET NULL,
	color TEXT NOT NULL DEFAULT '',
	created_at INTEGER NOT NULL,
	UNIQUE(user_id, slug)
);

CREATE TABLE IF NOT EXISTS file_tags (
	file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
	tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
	PRIMARY KEY (file_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_file_tags_tag ON file_tags(tag_id);

CREATE TABLE IF NOT EXISTS comments (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	body TEXT NOT NULL,
	created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_file ON comments(file_id);

CREATE TABLE IF NOT EXISTS bookmarks (
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
	created_at INTEGER NOT NULL,
	PRIMARY KEY (user_id, file_id)
);

CREATE TABLE IF NOT EXISTS likes (
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
	created_at INTEGER NOT NULL,
	PRIMARY KEY (user_id, file_id)
);

CREATE TABLE IF NOT EXISTS notifications (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	type TEXT NOT NULL,
	message TEXT NOT NULL,
	link TEXT,
	read INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);

CREATE TABLE IF NOT EXISTS api_keys (
	id TEXT PRIMARY KEY,
	user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	name TEXT NOT NULL,
	prefix TEXT NOT NULL,
	key_hash TEXT NOT NULL UNIQUE,
	created_at INTEGER NOT NULL,
	last_used_at INTEGER
);

CREATE TABLE IF NOT EXISTS short_links (
	id TEXT PRIMARY KEY,
	user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
	slug TEXT NOT NULL UNIQUE,
	target TEXT NOT NULL,
	clicks INTEGER NOT NULL DEFAULT 0,
	created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reports (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
	reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
	reason TEXT NOT NULL,
	status TEXT NOT NULL DEFAULT 'open',
	created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
	action TEXT NOT NULL,
	meta TEXT,
	ip TEXT,
	created_at INTEGER NOT NULL
);
`;

db.exec(schema);

// Add the third visibility state (unlisted) to databases created before it existed.
const fileColumns = db.prepare('PRAGMA table_info(files)').all() as { name: string }[];
if (!fileColumns.some((column) => column.name === 'listed')) {
	db.exec('ALTER TABLE files ADD COLUMN listed INTEGER NOT NULL DEFAULT 1');
}

// Collections can nest: every collection optionally points at a parent folder.
const collectionColumns = db.prepare('PRAGMA table_info(collections)').all() as { name: string }[];
if (!collectionColumns.some((column) => column.name === 'parent_id')) {
	db.exec(
		'ALTER TABLE collections ADD COLUMN parent_id TEXT REFERENCES collections(id) ON DELETE CASCADE'
	);
}
if (!collectionColumns.some((column) => column.name === 'listed')) {
	db.exec('ALTER TABLE collections ADD COLUMN listed INTEGER NOT NULL DEFAULT 1');
}
db.exec('CREATE INDEX IF NOT EXISTS idx_collections_parent ON collections(parent_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id)');

const now = Date.now();

function ensureSecret(key: string) {
	const existing = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
		| { value: string }
		| undefined;
	if (!existing) {
		db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(randomToken(32)));
	}
}

ensureSecret('authSecret');
ensureSecret('botSecret');

// New uploads are private unless the administrator explicitly changes the
// default. This one-time migration applies it to existing instances too.
const privateUploadsMigration = db
	.prepare("SELECT 1 FROM settings WHERE key = 'migration.defaultVisibility.private'")
	.get();
if (!privateUploadsMigration) {
	db.prepare(
		"INSERT INTO settings (key, value) VALUES ('defaultVisibility', '\"private\"') ON CONFLICT(key) DO UPDATE SET value = '\"private\"'"
	).run();
	db.prepare("INSERT INTO settings (key, value) VALUES ('migration.defaultVisibility.private', 'true')").run();
}

const userCount = (db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c;
if (userCount === 0) {
	const username = process.env.ADMIN_USERNAME || 'admin';
	const email = process.env.ADMIN_EMAIL || 'admin@nimbus.local';
	const password = process.env.ADMIN_PASSWORD || 'nimbus1234';
	db.prepare(
		`INSERT INTO users (email, username, password_hash, role, status, bio, created_at)
		 VALUES (?, ?, ?, 'admin', 'active', 'Nimbus administrator', ?)`
	).run(email, username, hashPassword(password), now);
	console.log(`[nimbus] created the first administrator "${username}" <${email}>`);
	if (!process.env.ADMIN_PASSWORD) {
		console.log('[nimbus] default password is "nimbus1234" — change it in Settings → Security');
	}
}
