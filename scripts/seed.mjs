import Database from 'better-sqlite3';
import sharp from 'sharp';
import { createHash, randomBytes, scryptSync } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const DATA_DIR = resolve(process.cwd(), process.env.DATA_DIR || 'data');
const DB_PATH = join(DATA_DIR, 'nimbus.db');

if (!existsSync(DB_PATH)) {
	console.error('[seed] No database found at', DB_PATH);
	console.error('[seed] Start the app once (npm run dev) so the schema is created, then run npm run seed again.');
	process.exit(1);
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const table = db
	.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'files'")
	.get();
if (!table) {
	console.error('[seed] The database schema is missing. Start the app once first.');
	process.exit(1);
}

const count = db.prepare('SELECT COUNT(*) AS c FROM files').get().c;
if (count > 0 && !process.argv.includes('--force')) {
	console.log(`[seed] The database already contains ${count} files. Nothing to do.`);
	console.log('[seed] Pass --force to seed additional demo content anyway.');
	process.exit(0);
}

const alphabet = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';

function id(length = 12) {
	const bytes = randomBytes(length);
	let out = '';
	for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
	return out;
}

function hashPassword(password) {
	const salt = randomBytes(16).toString('hex');
	const hash = scryptSync(password, salt, 64).toString('hex');
	return `scrypt:${salt}:${hash}`;
}

function ensureUser({ email, username, password, role = 'user', bio = '' }) {
	const existing = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?').get(email, username);
	if (existing) return existing.id;
	const info = db
		.prepare(
			`INSERT INTO users (email, username, password_hash, role, status, bio, created_at)
			 VALUES (?, ?, ?, ?, 'active', ?, ?)`
		)
		.run(email, username, hashPassword(password), role, bio, Date.now());
	return Number(info.lastInsertRowid);
}

const adminId = ensureUser({
	email: process.env.ADMIN_EMAIL || 'admin@nimbus.local',
	username: process.env.ADMIN_USERNAME || 'admin',
	password: process.env.ADMIN_PASSWORD || 'nimbus1234',
	role: 'admin',
	bio: 'Nimbus administrator and part-time pixel wrangler.'
});
const demoId = ensureUser({
	email: 'demo@nimbus.local',
	username: 'demo',
	password: 'demo1234',
	bio: 'Sharing gradients, wallpapers and the occasional loop. Say hi!'
});

const palettes = [
	['#6366f1', '#d946ef', '#0ea5e9'],
	['#f43f5e', '#f97316', '#facc15'],
	['#10b981', '#06b6d4', '#3b82f6'],
	['#8b5cf6', '#ec4899', '#f43f5e'],
	['#0f172a', '#6366f1', '#22d3ee'],
	['#f59e0b', '#ef4444', '#a855f7'],
	['#14b8a6', '#84cc16', '#eab308'],
	['#e11d48', '#7c3aed', '#2563eb'],
	['#334155', '#0ea5e9', '#a78bfa'],
	['#fb7185', '#fda4af', '#fef3c7'],
	['#020617', '#1d4ed8', '#22d3ee'],
	['#4c1d95', '#be185d', '#f97316']
];

function artwork(index) {
	const [a, b, c] = palettes[index % palettes.length];
	const seed = index + 1;
	return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
		<defs>
			<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stop-color="${a}"/>
				<stop offset="55%" stop-color="${b}"/>
				<stop offset="100%" stop-color="${c}"/>
			</linearGradient>
			<radialGradient id="glow" cx="35%" cy="30%" r="65%">
				<stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/>
				<stop offset="45%" stop-color="${b}" stop-opacity="0.15"/>
				<stop offset="100%" stop-color="${a}" stop-opacity="0"/>
			</radialGradient>
			<radialGradient id="glow2" cx="75%" cy="72%" r="45%">
				<stop offset="0%" stop-color="${c}" stop-opacity="0.9"/>
				<stop offset="100%" stop-color="${c}" stop-opacity="0"/>
			</radialGradient>
		</defs>
		<rect width="1600" height="1000" fill="url(#bg)"/>
		<rect width="1600" height="1000" fill="url(#glow)"/>
		<rect width="1600" height="1000" fill="url(#glow2)"/>
		<g fill="none" stroke="#ffffff" stroke-opacity="0.30" stroke-width="2">
			${Array.from({ length: 9 }, (_, i) => {
				const r = 60 + ((seed * 37 + i * 91) % 380);
				const cx = 120 + ((seed * 173 + i * 211) % 1360);
				const cy = 80 + ((seed * 97 + i * 157) % 840);
				return `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
			}).join('')}
		</g>
		<g fill="#ffffff" fill-opacity="0.10">
			${Array.from({ length: 6 }, (_, i) => {
				const x = ((seed * 233 + i * 277) % 1400) + 60;
				const y = ((seed * 311 + i * 191) % 760) + 80;
				const s = 30 + ((seed * 53 + i * 47) % 160);
				return `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s / 4}" transform="rotate(${(seed * 17 + i * 23) % 45} ${x} ${y})"/>`;
			}).join('')}
		</g>
		<g fill="#ffffff" fill-opacity="0.65">
			<circle cx="${180 + (seed * 53) % 500}" cy="${180 + (seed * 29) % 300}" r="${3 + (seed % 4)}"/>
			<circle cx="${900 + (seed * 41) % 500}" cy="${520 + (seed * 67) % 260}" r="${2 + (seed % 3)}"/>
		</g>
	</svg>`;
}

const titles = [
	'Aurora Drift',
	'Sunset Relay',
	'Coastal Signal',
	'Violet Static',
	'Midnight Current',
	'Ember Field',
	'Citrus Orbit',
	'Rose Frequency',
	'Polar Echo',
	'Soft Horizon',
	'Deep Blue Loop',
	'Neon Archive'
];

await mkdir(join(DATA_DIR, 'files'), { recursive: true });
await mkdir(join(DATA_DIR, 'thumbs'), { recursive: true });

const tagNames = ['abstract', 'gradient', 'wallpaper', 'digital art', 'minimal'];
const tagIds = new Map();
for (const name of tagNames) {
	const slug = name.replace(/\s+/g, '-');
	db.prepare(
		'INSERT INTO tags (user_id, name, slug, color, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, slug) DO NOTHING'
	).run(demoId, name, slug, '#6366f1', Date.now());
	const row = db.prepare('SELECT id FROM tags WHERE user_id = ? AND slug = ?').get(demoId, slug);
	tagIds.set(name, row.id);
}

const createdFiles = [];
for (let i = 0; i < titles.length; i++) {
	const svg = artwork(i);
	const original = await sharp(Buffer.from(svg)).webp({ quality: 88 }).toBuffer();
	const thumb = await sharp(original)
		.resize(720, 720, { fit: 'inside', withoutEnlargement: true })
		.webp({ quality: 78 })
		.toBuffer();

	const fileId = id(12);
	const shard = fileId.slice(0, 2);
	const relPath = join('files', shard, `${fileId}.webp`);
	const thumbPath = join('thumbs', `${fileId}.webp`);
	await mkdir(dirname(resolve(DATA_DIR, relPath)), { recursive: true });
	await writeFile(resolve(DATA_DIR, relPath), original);
	await writeFile(resolve(DATA_DIR, thumbPath), thumb);

	const isPublic = i !== 9 && i !== 11 ? 1 : 0;
	const ownerId = i % 4 === 3 ? adminId : demoId;
	const createdAt = Date.now() - (titles.length - i) * 3.5 * 60 * 60 * 1000;

	db.prepare(
		`INSERT INTO files (id, user_id, original_name, ext, mime, size, width, height, pages, hash, path, thumb_path,
			is_public, views, downloads, deleted_at, created_at, metadata)
		 VALUES (?, ?, ?, 'webp', 'image/webp', ?, 1600, 1000, 1, ?, ?, ?, ?, ?, 0, NULL, ?, ?)`
	).run(
		fileId,
		ownerId,
		`${titles[i].toLowerCase().replace(/\s+/g, '-')}.webp`,
		original.length,
		createHash('sha256').update(original).digest('hex'),
		relPath,
		thumbPath,
		isPublic,
		Math.round(20 + Math.random() * 500),
		createdAt,
		JSON.stringify({ format: 'webp', width: 1600, height: 1000, space: 'srgb', channels: 4 })
	);

	const primary = ['abstract', 'gradient', 'wallpaper'][i % 3];
	const secondary = tagNames[(i + 2) % tagNames.length];
	for (const name of new Set([primary, secondary])) {
		db.prepare('INSERT INTO file_tags (file_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING').run(
			fileId,
			tagIds.get(name)
		);
	}

	createdFiles.push({ id: fileId, thumbPath });
}

const collections = [
	{
		name: 'Neon Dreams',
		description: 'A hand-picked set of gradients and glows. Best viewed in the dark.',
		public: 1,
		files: createdFiles.slice(0, 5)
	},
	{
		name: 'Working notes',
		description: 'Private reference board.',
		public: 0,
		files: createdFiles.slice(5, 8)
	}
];

for (const collection of collections) {
	const collectionId = id(10);
	const slug = `${collection.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${id(4).toLowerCase()}`;
	db.prepare(
		`INSERT INTO collections (id, user_id, name, description, slug, is_public, cover_file_id, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	).run(
		collectionId,
		demoId,
		collection.name,
		collection.description,
		slug,
		collection.public,
		collection.files[0]?.id ?? null,
		Date.now()
	);
	collection.files.forEach((file, index) => {
		db.prepare(
			'INSERT INTO collection_files (collection_id, file_id, position) VALUES (?, ?, ?)'
		).run(collectionId, file.id, index);
	});
}

db.prepare(
	'INSERT INTO short_links (id, user_id, slug, target, clicks, created_at) VALUES (?, ?, ?, ?, ?, ?)'
).run(id(10), demoId, 'nimbus-docs', 'https://docs.slinkapp.io/', 0, Date.now());

db.prepare(
	'INSERT INTO notifications (user_id, type, message, link, read, created_at) VALUES (?, ?, ?, ?, 0, ?)'
).run(demoId, 'like', 'Someone liked your upload “Aurora Drift”.', '/dashboard/images', Date.now() - 3600_000);
db.prepare(
	'INSERT INTO notifications (user_id, type, message, link, read, created_at) VALUES (?, ?, ?, ?, 1, ?)'
).run(adminId, 'upload', 'Demo content was seeded into the instance.', '/explore', Date.now() - 7200_000);

db.close();

console.log('[seed] Done.');
console.log(`[seed] Seeded ${createdFiles.length} demo images, 2 collections and tags.`);
console.log(`[seed] Demo account: demo@nimbus.local / demo1234`);
console.log(
	`[seed] Admin account: ${process.env.ADMIN_EMAIL || 'admin@nimbus.local'} / ${
		process.env.ADMIN_PASSWORD ? '(from ADMIN_PASSWORD)' : 'nimbus1234'
	}`
);
