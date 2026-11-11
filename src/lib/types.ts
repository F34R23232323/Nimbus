export type Role = 'admin' | 'user';
export type UserStatus = 'active' | 'pending' | 'banned';
export type Visibility = 'public' | 'unlisted' | 'private';

export interface User {
	id: number;
	email: string;
	username: string;
	role: Role;
	status: UserStatus;
	bio: string;
	avatar_file_id: string | null;
	storage_quota: number;
	created_at: number;
}

export interface SessionUser extends User {
	avatar_url: string | null;
	storage_used?: number;
}

export interface FileRecord {
	id: string;
	user_id: number | null;
	original_name: string;
	ext: string;
	mime: string;
	size: number;
	width: number | null;
	height: number | null;
	pages: number;
	hash: string;
	path: string;
	thumb_path: string | null;
	is_public: number;
	listed: number;
	views: number;
	downloads: number;
	deleted_at: number | null;
	created_at: number;
	metadata: string | null;
}

export interface FileWithMeta extends FileRecord {
	username?: string | null;
	avatar_file_id?: string | null;
	likes?: number;
	comments?: number;
	tags?: Tag[];
}

export interface Tag {
	id: number;
	user_id: number;
	name: string;
	slug: string;
	parent_id: number | null;
	color: string;
	created_at: number;
	file_count?: number;
}

export interface Collection {
	id: string;
	user_id: number;
	parent_id: string | null;
	name: string;
	description: string;
	slug: string;
	is_public: number;
	listed: number;
	cover_file_id: string | null;
	created_at: number;
	file_count?: number;
	child_count?: number;
	preview_ids?: string | null;
	path?: string;
}

export interface Share {
	id: string;
	file_id: string;
	user_id: number | null;
	slug: string;
	password_hash: string | null;
	expires_at: number | null;
	max_views: number | null;
	views: number;
	created_at: number;
}

export interface Comment {
	id: number;
	file_id: string;
	user_id: number;
	body: string;
	created_at: number;
	username?: string;
	avatar_url?: string | null;
}

export interface Notification {
	id: number;
	user_id: number;
	type: string;
	message: string;
	link: string | null;
	read: number;
	created_at: number;
}

export interface ApiKey {
	id: string;
	user_id: number;
	name: string;
	prefix: string;
	created_at: number;
	last_used_at: number | null;
}

export interface ShortLink {
	id: string;
	user_id: number | null;
	slug: string;
	target: string;
	clicks: number;
	created_at: number;
}

export interface SiteSettings {
	siteName: string;
	siteDescription: string;
	accent: string;
	publicUrl: string;
	registrationEnabled: boolean;
	requireApproval: boolean;
	commentsEnabled: boolean;
	maxUploadSize: number;
	defaultVisibility: Visibility;
	compressByDefault: boolean;
	stripExif: boolean;
	directFileLinks: boolean;
	allowedExtensions: string[];
	defaultQuota: number;
	maintenance: boolean;
	discordToken: string;
	discordClientId: string;
	discordGuildId: string;
	discordChannelId: string;
	discordAnnounce: boolean;
	discordGuildInstall: boolean;
	discordUserInstall: boolean;
	discordCollectionId: string;
	botSecret: string;
	botOwnerId: number | null;
	botHeartbeat: number;
	botTag: string;
}

export type PublicSettings = Pick<
	SiteSettings,
	| 'siteName'
	| 'siteDescription'
	| 'accent'
	| 'registrationEnabled'
	| 'commentsEnabled'
	| 'maxUploadSize'
	| 'allowedExtensions'
	| 'defaultVisibility'
	| 'maintenance'
>;

export interface UploadResult {
	ok: boolean;
	file: FileWithMeta;
	url: string;
	absoluteUrl: string;
	thumbUrl: string | null;
	markdown: string;
	html: string;
	bbcode: string;
	duplicate?: boolean;
}

export interface SelectOption {
	value: string;
	label: string;
	description?: string;
	icon?: string;
	image?: string | null;
	disabled?: boolean;
}
