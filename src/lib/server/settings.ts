import { db } from './db';
import type { PublicSettings, SiteSettings } from '$lib/types';

export const DEFAULT_SETTINGS: SiteSettings = {
	siteName: 'Nimbus',
	siteDescription: 'A private-first image and file host with a GIF studio and Discord bot.',
	accent: '#c8a878',
	publicUrl: '',
	registrationEnabled: true,
	requireApproval: false,
	commentsEnabled: true,
	maxUploadSize: 25 * 1024 * 1024,
	defaultVisibility: 'private',
	compressByDefault: false,
	stripExif: false,
	directFileLinks: false,
	allowedExtensions: [
		'png',
		'jpg',
		'jpeg',
		'webp',
		'gif',
		'avif',
		'bmp',
		'ico',
		'svg',
		'tiff',
		'heic',
		'mp4',
		'webm',
		'mov',
		'pdf',
		'zip',
		'txt',
		'md',
		'csv',
		'json',
		'mp3',
		'wav'
	],
	defaultQuota: 0,
	maintenance: false,
	discordToken: '',
	discordClientId: '',
	discordGuildId: '',
	discordChannelId: '',
	discordAnnounce: true,
	discordGuildInstall: true,
	discordUserInstall: false,
	discordCollectionId: '',
	botSecret: '',
	botOwnerId: null,
	botHeartbeat: 0,
	botTag: ''
};

export function getSetting<K extends keyof SiteSettings>(key: K): SiteSettings[K] {
	const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
		| { value: string }
		| undefined;
	if (!row) return DEFAULT_SETTINGS[key];
	try {
		return JSON.parse(row.value) as SiteSettings[K];
	} catch {
		return DEFAULT_SETTINGS[key];
	}
}

export function setSetting<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]): void {
	db.prepare(
		'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
	).run(key, JSON.stringify(value));
}

export function getSettings(): SiteSettings {
	const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
	const settings: SiteSettings = { ...DEFAULT_SETTINGS };
	for (const row of rows) {
		if (!(row.key in DEFAULT_SETTINGS)) continue;
		try {
			(settings as unknown as Record<string, unknown>)[row.key] = JSON.parse(row.value);
		} catch {
			// ignore malformed values
		}
	}
	return settings;
}

export function updateSettings(patch: Partial<SiteSettings>): SiteSettings {
	const tx = db.transaction((entries: [string, unknown][]) => {
		for (const [key, value] of entries) {
			if (!(key in DEFAULT_SETTINGS)) continue;
			db.prepare(
				'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
			).run(key, JSON.stringify(value));
		}
	});
	tx(Object.entries(patch));
	return getSettings();
}

export function publicSettings(settings = getSettings()): PublicSettings {
	return {
		siteName: settings.siteName,
		siteDescription: settings.siteDescription,
		accent: settings.accent,
		registrationEnabled: settings.registrationEnabled,
		commentsEnabled: settings.commentsEnabled,
		maxUploadSize: settings.maxUploadSize,
		allowedExtensions: settings.allowedExtensions,
		defaultVisibility: settings.defaultVisibility,
		maintenance: settings.maintenance
	};
}

export function authSecret(): string {
	if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
	const row = db.prepare("SELECT value FROM settings WHERE key = 'authSecret'").get() as
		| { value: string }
		| undefined;
	if (!row) return 'nimbus-development-secret';
	try {
		return JSON.parse(row.value) as string;
	} catch {
		return row.value;
	}
}

export function siteUrl(origin?: string): string {
	const configured = getSetting('publicUrl') || process.env.PUBLIC_URL || process.env.ORIGIN || '';
	return (configured || origin || 'http://localhost:5173').replace(/\/+$/, '');
}
