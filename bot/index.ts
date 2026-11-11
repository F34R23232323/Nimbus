import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Client,
	EmbedBuilder,
	GatewayIntentBits,
	MessageFlags,
	PermissionFlagsBits,
	REST,
	Routes,
	SlashCommandBuilder
} from 'discord.js';
import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DATA_DIR = resolve(process.cwd(), process.env.DATA_DIR || 'data');
const DB_PATH = resolve(DATA_DIR, 'nimbus.db');

let connection: Database.Database | null = null;

function database(): Database.Database | null {
	if (connection) return connection;
	if (!existsSync(DB_PATH)) return null;
	connection = new Database(DB_PATH);
	connection.pragma('busy_timeout = 3000');
	return connection;
}

function readSettings(): Record<string, unknown> {
	const conn = database();
	if (!conn) return {};
	try {
		const rows = conn.prepare('SELECT key, value FROM settings').all() as {
			key: string;
			value: string;
		}[];
		const settings: Record<string, unknown> = {};
		for (const row of rows) {
			try {
				settings[row.key] = JSON.parse(row.value);
			} catch {
				settings[row.key] = row.value;
			}
		}
		return settings;
	} catch {
		return {};
	}
}

interface Config {
	token: string;
	clientId: string;
	guildId: string;
	channelId: string;
	announce: boolean;
	secret: string;
	baseUrl: string;
	siteName: string;
	defaultVisibility: 'public' | 'unlisted' | 'private';
	collectionId: string;
	guildInstall: boolean;
	userInstall: boolean;
}

function config(): Config {
	const settings = readSettings();
	const baseUrl = String(
		process.env.PUBLIC_URL ||
			settings.publicUrl ||
			process.env.ORIGIN ||
			`http://localhost:${process.env.PORT || 5173}`
	).replace(/\/+$/, '');
	return {
		token: process.env.DISCORD_TOKEN || String(settings.discordToken ?? ''),
		clientId: process.env.DISCORD_CLIENT_ID || String(settings.discordClientId ?? ''),
		guildId: process.env.DISCORD_GUILD_ID || String(settings.discordGuildId ?? ''),
		channelId: process.env.DISCORD_CHANNEL_ID || String(settings.discordChannelId ?? ''),
		announce: settings.discordAnnounce !== false,
		secret: process.env.BOT_SECRET || String(settings.botSecret ?? ''),
		baseUrl,
		siteName: String(settings.siteName ?? 'Nimbus'),
		defaultVisibility:
			settings.defaultVisibility === 'public' || settings.defaultVisibility === 'unlisted'
				? settings.defaultVisibility
				: 'private',
		collectionId: String(settings.discordCollectionId ?? '').trim(),
		guildInstall: settings.discordGuildInstall !== false,
		userInstall: settings.discordUserInstall === true
	};
}

async function api(path: string, init: RequestInit = {}): Promise<any> {
	const cfg = config();
	if (!cfg.secret) throw new Error('The bot secret is missing. Open the admin dashboard and copy it.');
	const headers = new Headers(init.headers);
	headers.set('x-bot-secret', cfg.secret);
	headers.set('accept', 'application/json');
	try {
		headers.set('origin', new URL(cfg.baseUrl).origin);
	} catch {
		headers.set('origin', cfg.baseUrl);
	}
	headers.set('referer', `${cfg.baseUrl}/`);
	if (typeof init.body === 'string' && !headers.has('content-type')) {
		headers.set('content-type', 'application/json');
	}
	const response = await fetch(`${cfg.baseUrl}/api${path}`, { ...init, headers });
	const text = await response.text();
	let data: any = {};
	try {
		data = text ? JSON.parse(text) : {};
	} catch {
		data = { error: text.slice(0, 300) };
	}
	if (!response.ok || data?.ok === false) {
		throw new Error(data?.error || `Request failed with status ${response.status}.`);
	}
	return data;
}

async function download(url: string): Promise<{ buffer: Buffer; contentType: string }> {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Could not download the attachment (${response.status}).`);
	const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
	return { buffer: Buffer.from(await response.arrayBuffer()), contentType };
}

function humanBytes(bytes: number): string {
	if (!bytes) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB'];
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1).replace(/\.0$/, '')} ${units[i]}`;
}

function ago(timestamp: number): string {
	const seconds = Math.round((Date.now() - timestamp) / 1000);
	if (seconds < 60) return 'just now';
	if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
	if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
	return `${Math.round(seconds / 86400)}d ago`;
}

function baseEmbed(cfg: Config, title: string): EmbedBuilder {
	return new EmbedBuilder().setColor(0x6366f1).setTitle(title).setFooter({ text: cfg.siteName });
}

function resultButtons(data: any, cfg: Config): ActionRowBuilder<ButtonBuilder> {
	const row = new ActionRowBuilder<ButtonBuilder>();
	row.addComponents(
		new ButtonBuilder().setLabel('Open file').setStyle(ButtonStyle.Link).setURL(data.absoluteUrl)
	);
	if (data.file?.id) {
		row.addComponents(
			new ButtonBuilder()
				.setLabel('Details page')
				.setStyle(ButtonStyle.Link)
				.setURL(`${cfg.baseUrl}/p/${data.file.id}`)
		);
	}
	if (data.shareUrl) {
		row.addComponents(
			new ButtonBuilder().setLabel('Share link').setStyle(ButtonStyle.Link).setURL(data.shareUrl)
		);
	}
	return row;
}

function isImage(mime: string): boolean {
	return typeof mime === 'string' && mime.startsWith('image/');
}

async function announce(client: Client, cfg: Config, data: any): Promise<void> {
	if (!cfg.announce || !cfg.channelId || data.file?.is_public !== 1 || data.file?.listed !== 1) return;
	try {
		const channel = await client.channels.fetch(cfg.channelId);
		if (!channel || !channel.isTextBased() || !('send' in channel)) return;
		const embed = baseEmbed(cfg, 'New upload')
			.setDescription(`[${data.file.original_name}](${data.absoluteUrl})\n${humanBytes(data.file.size)}`)
			.setImage(isImage(data.file.mime) ? data.absoluteUrl : null);
		await (channel as any).send({ embeds: [embed] });
	} catch (error) {
		console.warn('[nimbus-bot] could not announce upload:', (error as Error).message);
	}
}

function commandList(cfg: Config) {
	const integrationTypes = cfg.userInstall ? (cfg.guildInstall ? [0, 1] : [1]) : [0];
	const contexts = cfg.userInstall ? [0, 1, 2] : [0];

	return [
		new SlashCommandBuilder()
			.setName('upload')
			.setDescription('Upload an image or file and get a shareable URL')
			.addAttachmentOption((option) =>
				option.setName('file').setDescription('The file to upload').setRequired(true)
			)
			.addStringOption((option) =>
				option
					.setName('visibility')
					.setDescription('Defaults to the instance setting')
					.addChoices(
						{ name: 'Public — listed in Explore', value: 'public' },
						{ name: 'Unlisted — direct link only', value: 'unlisted' },
						{ name: 'Private — owner only', value: 'private' }
					)
			)
			.addStringOption((option) =>
				option.setName('tags').setDescription('Comma separated tags (e.g. art, wallpaper)')
			),

		new SlashCommandBuilder()
			.setName('gif')
			.setDescription('Convert an image into a .gif file (no animation)')
			.addAttachmentOption((option) =>
				option.setName('image').setDescription('The image to convert').setRequired(true)
			)
			.addStringOption((option) =>
				option
					.setName('visibility')
					.setDescription('Defaults to the instance setting')
					.addChoices(
						{ name: 'Public — listed in Explore', value: 'public' },
						{ name: 'Unlisted — direct link only', value: 'unlisted' },
						{ name: 'Private — owner only', value: 'private' }
					)
			),

		new SlashCommandBuilder()
			.setName('share')
			.setDescription('Create a private, expiring share link for one of your files')
			.addStringOption((option) =>
				option.setName('file_id').setDescription('The file ID').setRequired(true)
			)
			.addStringOption((option) =>
				option.setName('password').setDescription('Optional password').setRequired(false)
			)
			.addIntegerOption((option) =>
				option
					.setName('hours')
					.setDescription('Expire after this many hours (0 = never)')
					.setMinValue(0)
					.setMaxValue(8760)
			),

		new SlashCommandBuilder()
			.setName('recent')
			.setDescription('Show the latest public uploads')
			.addIntegerOption((option) =>
				option
					.setName('limit')
					.setDescription('How many uploads to show (default 5)')
					.setMinValue(1)
					.setMaxValue(10)
			),

		new SlashCommandBuilder().setName('stats').setDescription('Show instance statistics'),

		new SlashCommandBuilder()
			.setName('shorten')
			.setDescription('Create a short link for any URL')
			.addStringOption((option) =>
				option.setName('url').setDescription('The URL to shorten').setRequired(true)
			)
			.addStringOption((option) =>
				option.setName('slug').setDescription('Optional custom slug').setRequired(false)
			),

		new SlashCommandBuilder()
			.setName('delete')
			.setDescription('Delete an upload (requires Manage Server)')
			.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
			.addStringOption((option) =>
				option.setName('file_id').setDescription('The file ID to delete').setRequired(true)
			),

		new SlashCommandBuilder().setName('help').setDescription('List the commands this bot provides')
	]
		.map((command) => command.toJSON())
		.map((command) => ({
			...command,
			integration_types: integrationTypes,
			contexts
		}));
}

function guildCommandList(commands: { integration_types?: unknown; contexts?: unknown }[]) {
	return commands.map(({ integration_types, contexts, ...command }) => command);
}

async function register(): Promise<void> {
	const cfg = config();
	if (!cfg.token || !cfg.clientId) {
		throw new Error('Set the bot token and client ID in the admin dashboard first.');
	}
	if (!cfg.guildInstall && !cfg.userInstall) {
		throw new Error('Enable at least one Discord install type (server or user).');
	}

	const commands = commandList(cfg);
	const rest = new REST().setToken(cfg.token);

	if (cfg.userInstall || !cfg.guildId) {
		await rest.put(Routes.applicationCommands(cfg.clientId), { body: commands });
		console.log(
			`[nimbus-bot] registered global commands (server=${cfg.guildInstall}, user=${cfg.userInstall}; may take up to an hour to appear)`
		);
	}

	if (cfg.guildId && cfg.guildInstall) {
		await rest.put(Routes.applicationGuildCommands(cfg.clientId, cfg.guildId), {
			body: guildCommandList(commands)
		});
		console.log(`[nimbus-bot] registered commands in guild ${cfg.guildId}`);
	}
}

function commandSignature(cfg: Config, commands: unknown[]): string {
	return createHash('sha256')
		.update(
			JSON.stringify({
				guildId: cfg.guildId,
				guildInstall: cfg.guildInstall,
				userInstall: cfg.userInstall,
				commands
			})
		)
		.digest('hex');
}

async function syncCommands(client: Client, cfg: Config): Promise<void> {
	if (!cfg.guildInstall && !cfg.userInstall) {
		console.warn('[nimbus-bot] no Discord install types enabled — set one in the admin dashboard.');
		return;
	}

	const clientId = cfg.clientId || client.application?.id;
	if (!clientId || !cfg.token) return;

	const commands = commandList(cfg);
	const signature = commandSignature(cfg, commands);
	const conn = database();

	if (conn) {
		try {
			const row = conn
				.prepare("SELECT value FROM settings WHERE key = 'botCommandsSignature'")
				.get() as { value: string } | undefined;
			if (row && JSON.parse(row.value) === signature) return;
		} catch {
			// fall through and re-register
		}
	}

	const rest = new REST().setToken(cfg.token);
	const errors: string[] = [];

	if (cfg.userInstall || !cfg.guildId) {
		try {
			await rest.put(Routes.applicationCommands(clientId), { body: commands });
		} catch (error) {
			errors.push(`global commands: ${(error as Error).message}`);
		}
	}

	if (cfg.guildId && cfg.guildInstall) {
		try {
			await rest.put(Routes.applicationGuildCommands(clientId, cfg.guildId), {
				body: guildCommandList(commands)
			});
		} catch (error) {
			errors.push(`guild commands: ${(error as Error).message}`);
		}
	}

	if (errors.length) {
		throw new Error(errors.join('; '));
	}

	if (conn) {
		conn.prepare(
			'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
		).run('botCommandsSignature', JSON.stringify(signature));
	}

	console.log(
		`[nimbus-bot] slash commands synced (server install=${cfg.guildInstall}, user install=${cfg.userInstall})`
	);
}

function heartbeat(client: Client): void {
	const conn = database();
	if (!conn) return;
	try {
		const stamp = JSON.stringify(Date.now());
		const tag = JSON.stringify(client.user?.tag ?? 'Nimbus');
		const upsert = conn.prepare(
			'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
		);
		upsert.run('botHeartbeat', stamp);
		upsert.run('botTag', tag);
	} catch (error) {
		console.warn('[nimbus-bot] heartbeat failed:', (error as Error).message);
	}
}

const cfg = config();

if (process.argv.includes('--register')) {
	register()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error('[nimbus-bot]', error.message);
			process.exit(1);
		});
} else if (!cfg.token) {
	console.error('[nimbus-bot] No Discord token configured.');
	console.error('  Add it at /dashboard/admin?tab=settings or set DISCORD_TOKEN in .env');
	console.error('  Then start the app once so the database exists, and run: npm run start');
	process.exit(0);
} else {
	const client = new Client({ intents: [GatewayIntentBits.Guilds] });

	client.once('ready', () => {
		const current = config();
		console.log(`[nimbus-bot] online as ${client.user?.tag}`);
		console.log(`[nimbus-bot] API base: ${current.baseUrl}`);
		console.log(
			`[nimbus-bot] install modes: server=${current.guildInstall}, user=${current.userInstall}`
		);
		heartbeat(client);
		setInterval(() => heartbeat(client), 60_000);
		syncCommands(client, current).catch((error) => {
			console.warn('[nimbus-bot] command sync failed:', error?.message ?? error);
		});
	});

	client.on('interactionCreate', async (interaction) => {
		if (!interaction.isChatInputCommand()) return;
		const current = config();
		const authorizingOwners = (interaction as any).authorizingIntegrationOwners ?? {};
		const usedUserInstall = Boolean(authorizingOwners['1'] ?? authorizingOwners[1]);
		const ephemeral =
			current.userInstall ||
			usedUserInstall ||
			!interaction.guildId ||
			['share', 'delete', 'shorten'].includes(interaction.commandName);

		try {
			await interaction.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : undefined });

			if (interaction.commandName === 'upload') {
				const attachment = interaction.options.getAttachment('file', true);
				const visibility = interaction.options.getString('visibility') ?? current.defaultVisibility;
				const tags = interaction.options.getString('tags') ?? undefined;
				const { buffer, contentType } = await download(attachment.url);

				const form = new FormData();
				form.append(
					'file',
					new Blob([new Uint8Array(buffer)], { type: contentType }),
					attachment.name || 'upload'
				);
				form.append('visibility', visibility);
				if (current.collectionId) form.append('collectionId', current.collectionId);
				if (tags) form.append('tags', tags);

				const data = await api('/upload', { method: 'POST', body: form });

				const embed = baseEmbed(current, 'Upload complete')
					.setDescription(`**${data.file.original_name}**\n[Open file](${data.absoluteUrl})`)
					.addFields(
						{ name: 'Direct URL', value: `\`\`\`${data.absoluteUrl}\`\`\`` },
						{ name: 'Markdown', value: `\`\`\`${data.markdown}\`\`\`` },
						{
							name: 'Details',
							value: `${humanBytes(data.file.size)} · ${data.file.mime} · ${
								visibility === 'public'
									? 'public'
									: visibility === 'unlisted'
										? 'unlisted (link only)'
										: 'private (owner only)'
							}${data.duplicate ? ' · duplicate' : ''}`,
							inline: true
						}
					)
					.setImage(
						isImage(data.file.mime) && visibility !== 'private' ? data.absoluteUrl : null
					);

				await interaction.editReply({
					embeds: [embed],
					components: [resultButtons(data, current)]
				});
				if (interaction.guildId) await announce(client, current, data);
				return;
			}

			if (interaction.commandName === 'gif') {
				const attachment = interaction.options.getAttachment('image', true);
				const { buffer, contentType } = await download(attachment.url);
				const visibility = interaction.options.getString('visibility') ?? current.defaultVisibility;

				const form = new FormData();
				form.append(
					'frames',
					new Blob([new Uint8Array(buffer)], { type: contentType }),
					attachment.name || 'image.png'
				);
				form.append('effect', 'none');
				form.append('transition', 'none');
				form.append('loop', '0');
				form.append('visibility', visibility);
				if (current.collectionId) form.append('collectionId', current.collectionId);

				const data = await api('/gif', { method: 'POST', body: form });
				const embed = baseEmbed(current, 'GIF ready')
					.setDescription(`[${data.file.original_name}](${data.absoluteUrl})`)
					.setImage(visibility !== 'private' ? data.absoluteUrl : null)
					.addFields(
						{ name: 'Direct URL', value: `\`\`\`${data.absoluteUrl}\`\`\`` },
						{
							name: 'Details',
							value: `${humanBytes(data.file.size)} · static .gif · ${
								visibility === 'public'
									? 'public'
									: visibility === 'unlisted'
										? 'unlisted (link only)'
										: 'private (owner only)'
							}`
						}
					);
				await interaction.editReply({
					embeds: [embed],
					components: [resultButtons(data, current)]
				});
				return;
			}

			if (interaction.commandName === 'share') {
				const fileId = interaction.options.getString('file_id', true);
				const password = interaction.options.getString('password') ?? '';
				const hours = interaction.options.getInteger('hours') ?? 0;
				const data = await api('/shares', {
					method: 'POST',
					body: JSON.stringify({ fileId, password, expiresInHours: hours })
				});
				const embed = baseEmbed(current, 'Share link created')
					.setDescription(`\`\`\`${data.url}\`\`\``)
					.addFields({
						name: 'Protection',
						value: `${password ? 'Password protected' : 'No password'} · ${
							hours > 0 ? `expires in ${hours}h` : 'never expires'
						}`
					});
				await interaction.editReply({ embeds: [embed] });
				return;
			}

			if (interaction.commandName === 'recent') {
				const limit = interaction.options.getInteger('limit') ?? 5;
				const data = await api(`/public?limit=${limit}`);
				if (!data.files?.length) {
					await interaction.editReply({ content: 'No public uploads yet.' });
					return;
				}
				const embed = baseEmbed(current, 'Recent public uploads').setDescription(
					data.files
						.map(
							(file: any, index: number) =>
								`**${index + 1}.** [${file.name}](${file.page_url}) · ${humanBytes(file.size)} · ${ago(
									file.created_at
								)}${file.username ? ` · @${file.username}` : ''}`
						)
						.join('\n')
				);
				if (data.files[0].thumb_url) embed.setThumbnail(data.files[0].thumb_url);
				await interaction.editReply({ embeds: [embed] });
				return;
			}

			if (interaction.commandName === 'stats') {
				const data = await api('/stats');
				const embed = baseEmbed(current, `${data.site.name} statistics`)
					.addFields(
						{ name: 'Files', value: String(data.stats.files), inline: true },
						{ name: 'Users', value: String(data.stats.users), inline: true },
						{ name: 'Views', value: String(data.stats.views), inline: true },
						{ name: 'Storage', value: humanBytes(data.stats.size), inline: true },
						{ name: 'Share links', value: String(data.stats.shares), inline: true },
						{
							name: 'Popular tags',
							value: data.tags?.length
								? data.tags.map((tag: any) => `#${tag.name}`).join(' ')
								: 'No tags yet'
						}
					);
				await interaction.editReply({ embeds: [embed] });
				return;
			}

			if (interaction.commandName === 'shorten') {
				const target = interaction.options.getString('url', true);
				const slug = interaction.options.getString('slug') ?? '';
				const data = await api('/short', {
					method: 'POST',
					body: JSON.stringify({ target, slug })
				});
				await interaction.editReply({
					content: `🔗 ${data.url}`
				});
				return;
			}

			if (interaction.commandName === 'delete') {
				if (
					!interaction.guildId ||
					!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
				) {
					throw new Error('You need Manage Server in a guild to delete uploads.');
				}
				const fileId = interaction.options.getString('file_id', true);
				await api(`/files/${fileId}`, { method: 'DELETE' });
				await interaction.editReply({ content: `Deleted \`${fileId}\` and revoked its share links.` });
				return;
			}

			if (interaction.commandName === 'help') {
				const embed = baseEmbed(current, `${current.siteName} bot commands`)
					.setDescription(
						[
							'`/upload` — upload an attachment and get a direct URL',
							'`/gif` — convert an image into a .gif file (no animation)',
							'`/share` — create a password/expiry protected share link',
							'`/recent` — latest public uploads',
							'`/stats` — instance statistics',
							'`/shorten` — create a short link for any URL',
							'`/delete` — delete an upload (Manage Server only)',
							'`/help` — show this message'
						].join('\n')
					)
					.addFields({
						name: 'Web dashboard',
						value: `${current.baseUrl}/dashboard`
					});
				await interaction.editReply({ embeds: [embed] });
				return;
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Something went wrong.';
			console.error(`[nimbus-bot] /${interaction.commandName} failed:`, message);
			const reply = { content: `❌ ${message}` };
			try {
				if (interaction.deferred) await interaction.editReply(reply);
				else await interaction.reply({ ...reply, flags: MessageFlags.Ephemeral });
			} catch {
				// interaction may have expired
			}
		}
	});

	client.on('error', (error) => console.error('[nimbus-bot] client error', error));

	process.on('SIGINT', () => {
		console.log('[nimbus-bot] shutting down…');
		client.destroy();
		connection?.close();
		process.exit(0);
	});

	client.login(cfg.token).catch((error) => {
		console.error('[nimbus-bot] login failed:', error?.message ?? error);
		connection?.close();
		process.exit(1);
	});
}
