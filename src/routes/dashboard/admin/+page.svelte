<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import StatCard from '$lib/components/StatCard.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Select from '$lib/components/Select.svelte';
	import CollectionPicker from '$lib/components/CollectionPicker.svelte';
	import type { SelectOption } from '$lib/types';
	import { confirmSubmit } from '$lib/actions/confirmSubmit';
	import { formatBytes, formatDate, formatNumber, timeAgo } from '$lib/utils/format';

	let { data, form }: { data: PageData; form: (ActionData & Record<string, any>) | null } = $props();

	type Tab = 'users' | 'settings' | 'moderation' | 'integrations';
	let tab = $state<Tab>(data.tab as Tab);
	let userQuery = $state('');

	const roleOptions: SelectOption[] = [
		{ value: 'user', label: 'User', icon: 'user' },
		{ value: 'admin', label: 'Admin', icon: 'shield' }
	];
	const statusOptions: SelectOption[] = [
		{ value: 'active', label: 'Active', icon: 'check' },
		{ value: 'pending', label: 'Pending', icon: 'clock' },
		{ value: 'banned', label: 'Banned', icon: 'lock' }
	];
	const visibilityOptions: SelectOption[] = [
		{ value: 'public', label: 'Public', icon: 'globe' },
		{ value: 'unlisted', label: 'Unlisted (link only)', icon: 'link' },
		{ value: 'private', label: 'Private', icon: 'lock' }
	];
	const botOwnerOptions = $derived<SelectOption[]>([
		{ value: '', label: 'First administrator', icon: 'users' },
		...data.users
			.filter((user) => user.role === 'admin')
			.map((user) => ({ value: String(user.id), label: `@${user.username}`, icon: 'shield' }))
	]);

	const tabs = [
		{ id: 'users', label: 'Users', icon: 'users' },
		{ id: 'settings', label: 'Instance', icon: 'settings' },
		{ id: 'moderation', label: 'Moderation', icon: 'shield' },
		{ id: 'integrations', label: 'Integrations', icon: 'discord' }
	] as const;

	const filteredUsers = $derived(
		data.users.filter(
			(user) =>
				!userQuery ||
				user.username.toLowerCase().includes(userQuery.toLowerCase()) ||
				user.email.toLowerCase().includes(userQuery.toLowerCase())
		)
	);
	const openReports = $derived(data.reports.filter((report) => report.status === 'open'));
	const botOnline = $derived(data.settings.botHeartbeat > 0 && Date.now() - data.settings.botHeartbeat < 120_000);
	const inviteUrl = $derived(
		data.settings.discordClientId
			? `https://discord.com/api/oauth2/authorize?client_id=${data.settings.discordClientId}&permissions=277025508352&scope=bot%20applications.commands&integration_type=0`
			: ''
	);
	const userInviteUrl = $derived(
		data.settings.discordClientId
			? `https://discord.com/oauth2/authorize?client_id=${data.settings.discordClientId}&scope=applications.commands&integration_type=1`
			: ''
	);

	function setTab(next: Tab) {
		tab = next;
		history.replaceState(null, '', `?tab=${next}`);
	}
</script>

<svelte:head><title>Administration · {data.site.siteName}</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-5">
	<div>
		<span class="badge badge-accent"><Icon name="shield" size={12} /> Administrator</span>
		<h1 class="mt-3 page-title">Administration</h1>
		<p class="mt-1 text-sm text-[rgb(var(--fg-muted))]">Manage users, instance settings, moderation and the Discord bot.</p>
	</div>
	<div class="flex items-center gap-2">
		<span class="badge {botOnline ? 'badge-success' : ''}"><span class="h-1.5 w-1.5 rounded-full {botOnline ? 'bg-emerald-400' : 'bg-[rgb(var(--fg-subtle))]'}"></span> Bot {botOnline ? 'online' : 'offline'}</span>
		{#if openReports.length}<span class="badge badge-warning">{openReports.length} open reports</span>{/if}
	</div>
</div>

{#if form?.success}
	<div class="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">{form.success}</div>
{/if}
{#if form?.error}
	<div class="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{form.error}</div>
{/if}
{#if form?.tempPassword}
	<div class="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
		<p class="text-sm font-semibold text-amber-500">Temporary password for @{form.tempUser}</p>
		<div class="mt-2 flex items-center gap-2">
			<code class="min-w-0 flex-1 truncate rounded-lg bg-black/25 px-2.5 py-2 text-[12px] text-amber-300">{form.tempPassword}</code>
			<CopyButton text={form.tempPassword} iconOnly />
		</div>
		<p class="mt-1 text-[11px] text-amber-500/80">Share it securely. All their sessions were signed out.</p>
	</div>
{/if}

<div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
	<StatCard label="Users" value={formatNumber(data.stats.users)} icon="users" hint={`${data.stats.pending} awaiting approval`} />
	<StatCard label="Files" value={formatNumber(data.stats.count)} icon="images" tone="sky" hint={formatBytes(data.stats.size)} />
	<StatCard label="Views" value={formatNumber(data.stats.views)} icon="eye" tone="emerald" />
	<StatCard label="Open reports" value={formatNumber(openReports.length)} icon="alert" tone="amber" />
</div>

<nav class="card-flat mt-6 flex gap-1.5 overflow-x-auto p-2.5">
	{#each tabs as item (item.id)}
		<button
			class="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition {tab === item.id
				? 'bg-accent/10 text-accent'
				: 'text-[rgb(var(--fg-muted))] hover:bg-[rgb(var(--surface-2))]'}"
			onclick={() => setTab(item.id)}
		>
			<Icon name={item.icon} size={15} /> {item.label}
			{#if item.id === 'moderation' && openReports.length}<span class="rounded-full bg-amber-500/20 px-1.5 text-[10px] font-bold text-amber-400">{openReports.length}</span>{/if}
		</button>
	{/each}
</nav>

{#if tab === 'users'}
	<div class="card-flat mt-4 overflow-hidden">
		<div class="flex flex-wrap items-center gap-2 border-b border-[rgb(var(--border))] px-4 py-3">
			<div class="relative flex-1">
				<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--fg-subtle))]"><Icon name="search" size={14} /></span>
				<input class="input h-9 py-1.5 pl-9 text-xs" placeholder="Search users by name or email…" bind:value={userQuery} />
			</div>
			<span class="text-xs text-[rgb(var(--fg-subtle))]">{filteredUsers.length} user{filteredUsers.length === 1 ? '' : 's'}</span>
		</div>

		<ul class="divide-y divide-[rgb(var(--border))]">
			{#each filteredUsers as user (user.id)}
				<li class="p-5">
					<div class="flex flex-wrap items-start gap-3">
						<Avatar name={user.username} src={user.avatar_file_id ? `/t/${user.avatar_file_id}` : null} size={42} />
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<p class="text-sm font-semibold">@{user.username}</p>
								{#if user.id === data.currentUserId}<span class="badge badge-accent">You</span>{/if}
								{#if user.role === 'admin'}<span class="badge badge-accent">Admin</span>{/if}
								{#if user.status === 'pending'}<span class="badge badge-warning">Pending</span>{/if}
								{#if user.status === 'banned'}<span class="badge badge-danger">Banned</span>{/if}
							</div>
							<p class="mt-0.5 text-xs text-[rgb(var(--fg-subtle))]">{user.email} · joined {formatDate(user.created_at)}</p>
							<p class="mt-1 text-[11px] text-[rgb(var(--fg-subtle))]">
								{user.file_count} files · {formatBytes(user.storage_used)}{user.storage_quota > 0 ? ` of ${formatBytes(user.storage_quota)}` : ' · unlimited'}
							</p>
						</div>

						<div class="flex flex-wrap items-center gap-1.5">
							{#if user.status === 'pending'}
								<form method="POST" action="?/updateUser" use:enhance>
									<input type="hidden" name="id" value={user.id} />
									<input type="hidden" name="role" value={user.role} />
									<input type="hidden" name="status" value="active" />
									<input type="hidden" name="quotaMb" value={Math.round(user.storage_quota / 1048576)} />
									<button class="btn-primary btn-sm" type="submit"><Icon name="check" size={13} /> Approve</button>
								</form>
							{/if}
							<form method="POST" action="?/resetPassword" use:confirmSubmit={{ title: `Reset password for @${user.username}?`, message: 'Their sessions are signed out and a temporary password is generated.', confirmLabel: 'Reset password' }}>
								<input type="hidden" name="id" value={user.id} />
								<button class="btn-ghost btn-sm" type="submit"><Icon name="key" size={13} /> Reset</button>
							</form>
							{#if user.id !== data.currentUserId}
								<form method="POST" action="?/deleteUser" use:confirmSubmit={{ title: `Delete @${user.username}?`, message: 'Their uploads, collections, tags and sessions are permanently deleted. This cannot be undone.', confirmLabel: 'Delete user' }}>
									<input type="hidden" name="id" value={user.id} />
									<button class="btn-ghost btn-sm text-red-400" type="submit"><Icon name="trash" size={13} /> Delete</button>
								</form>
							{/if}
						</div>
					</div>

					<form method="POST" action="?/updateUser" use:enhance class="mt-4 flex flex-wrap items-end gap-2.5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3.5">
						<input type="hidden" name="id" value={user.id} />
						<div>
							<label class="label text-[10px]">Role</label>
							<Select name="role" class="w-28" value={user.role} options={roleOptions} disabled={user.id === data.currentUserId} />
						</div>
						<div>
							<label class="label text-[10px]">Status</label>
							<Select name="status" class="w-32" value={user.status} options={statusOptions} />
						</div>
						<div>
							<label class="label text-[10px]">Quota (MB)</label>
							<input name="quotaMb" type="number" min="0" class="input h-8 w-28 py-1 text-xs" value={Math.round(user.storage_quota / 1048576)} placeholder="0 = ∞" />
						</div>
						<button class="btn-secondary btn-sm h-8" type="submit">Save</button>
					</form>
				</li>
			{/each}
		</ul>
		{#if !filteredUsers.length}
			<p class="px-4 py-8 text-center text-sm text-[rgb(var(--fg-subtle))]">No users match that search.</p>
		{/if}
	</div>

{:else if tab === 'settings'}
	<form method="POST" action="?/saveSettings" use:enhance class="mt-6 space-y-6">
		<div class="card-flat p-6">
			<h2 class="text-sm font-semibold">General</h2>
			<div class="mt-4 grid gap-4 sm:grid-cols-2">
				<div>
					<label class="label" for="siteName">Site name</label>
					<input id="siteName" name="siteName" class="input" value={data.settings.siteName} maxlength="60" required />
				</div>
				<div>
					<label class="label" for="accent">Accent colour</label>
					<div class="flex gap-2">
						<input id="accent" name="accent" type="color" value={data.settings.accent} class="h-[42px] w-14 cursor-pointer rounded-xl border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-2))] p-1" />
						<input class="input" value={data.settings.accent} aria-label="Accent hex" readonly />
					</div>
				</div>
				<div class="sm:col-span-2">
					<label class="label" for="siteDescription">Description</label>
					<textarea id="siteDescription" name="siteDescription" class="textarea min-h-[72px]" maxlength="240">{data.settings.siteDescription}</textarea>
				</div>
				<div class="sm:col-span-2">
					<label class="label" for="publicUrl">Public URL</label>
					<input id="publicUrl" name="publicUrl" class="input" value={data.settings.publicUrl} placeholder="https://images.example.com" />
					<p class="hint">Used for links in the Discord bot and API responses. Leave empty to use request origin.</p>
				</div>
			</div>
			<div class="mt-4 grid gap-2 sm:grid-cols-2">
				<label class="flex cursor-pointer items-center justify-between gap-5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-4 py-2.5">
					<span class="text-sm">Maintenance mode</span>
					<input type="checkbox" name="maintenance" value="1" checked={data.settings.maintenance} class="sr-only" />
					<span class="switch"></span>
				</label>
				<label class="flex cursor-pointer items-center justify-between gap-5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-4 py-2.5">
					<span class="text-sm">Comments enabled</span>
					<input type="checkbox" name="commentsEnabled" value="1" checked={data.settings.commentsEnabled} class="sr-only" />
					<span class="switch"></span>
				</label>
			</div>
		</div>

		<div class="card-flat p-6">
			<h2 class="text-sm font-semibold">Uploads &amp; storage</h2>
			<div class="mt-4 grid gap-4 sm:grid-cols-2">
				<div>
					<label class="label" for="maxUploadMb">Max upload size (MB)</label>
					<input id="maxUploadMb" name="maxUploadMb" type="number" min="1" class="input" value={Math.round(data.settings.maxUploadSize / 1048576)} />
				</div>
				<div>
					<label class="label" for="defaultQuotaMb">Default user quota (MB, 0 = unlimited)</label>
					<input id="defaultQuotaMb" name="defaultQuotaMb" type="number" min="0" class="input" value={Math.round(data.settings.defaultQuota / 1048576)} />
				</div>
				<div>
					<label class="label" for="defaultVisibility">Default visibility</label>
					<Select id="defaultVisibility" name="defaultVisibility" value={data.settings.defaultVisibility} options={visibilityOptions} />
				</div>
				<div class="flex flex-col justify-end gap-2">
					<label class="flex cursor-pointer items-center justify-between gap-5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-4 py-2.5">
						<span class="text-sm">Compress by default</span>
						<input type="checkbox" name="compressByDefault" value="1" checked={data.settings.compressByDefault} class="sr-only" />
						<span class="switch"></span>
					</label>
					<label class="flex cursor-pointer items-center justify-between gap-5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-4 py-2.5">
						<span class="text-sm">Strip EXIF metadata</span>
						<input type="checkbox" name="stripExif" value="1" checked={data.settings.stripExif} class="sr-only" />
						<span class="switch"></span>
					</label>
				</div>
				<div class="sm:col-span-2">
					<label class="label" for="allowedExtensions">Allowed extensions</label>
					<textarea id="allowedExtensions" name="allowedExtensions" class="textarea font-mono text-xs" rows="3">{data.settings.allowedExtensions.join(', ')}</textarea>
					<p class="hint">Comma separated, without dots. Applies to uploads and the Discord bot.</p>
				</div>
				<label class="flex cursor-pointer items-center justify-between gap-5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-4 py-3 sm:col-span-2">
					<span>
						<span class="block text-sm">Extension links</span>
						<span class="mt-0.5 block text-[11px] text-[rgb(var(--fg-subtle))]">
							Return <code>/i/&lt;id&gt;.png</code> instead of <code>/i/&lt;id&gt;</code> from uploads, the API and the Discord bot. Both styles always resolve.
						</span>
					</span>
					<input type="checkbox" name="directFileLinks" value="1" checked={data.settings.directFileLinks} class="sr-only" />
					<span class="switch"></span>
				</label>
			</div>
		</div>

		<div class="card-flat p-6">
			<h2 class="text-sm font-semibold">Registration &amp; access</h2>
			<div class="mt-4 grid gap-2 sm:grid-cols-2">
				<label class="flex cursor-pointer items-center justify-between gap-5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-4 py-2.5">
					<span class="text-sm">Public registration</span>
					<input type="checkbox" name="registrationEnabled" value="1" checked={data.settings.registrationEnabled} class="sr-only" />
					<span class="switch"></span>
				</label>
				<label class="flex cursor-pointer items-center justify-between gap-5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-4 py-2.5">
					<span class="text-sm">Require admin approval</span>
					<input type="checkbox" name="requireApproval" value="1" checked={data.settings.requireApproval} class="sr-only" />
					<span class="switch"></span>
				</label>
			</div>
		</div>

		<div class="card-flat p-6">
			<div class="flex items-center gap-2">
				<Icon name="discord" size={17} class="text-[#5865F2]" />
				<h2 class="text-sm font-semibold">Discord bot</h2>
			</div>
			<div class="mt-4 grid gap-4 sm:grid-cols-2">
				<div class="sm:col-span-2">
					<label class="label" for="discordToken">Bot token</label>
					<input id="discordToken" name="discordToken" type="password" class="input font-mono text-xs" value={data.settings.discordToken} placeholder="MTIz… (from the Discord developer portal)" autocomplete="off" />
				</div>
				<div>
					<label class="label" for="discordClientId">Application / client ID</label>
					<input id="discordClientId" name="discordClientId" class="input font-mono text-xs" value={data.settings.discordClientId} placeholder="123456789012345678" />
				</div>
				<div>
					<label class="label" for="discordGuildId">Guild ID <span class="font-normal normal-case text-[rgb(var(--fg-subtle))]">(optional)</span></label>
					<input id="discordGuildId" name="discordGuildId" class="input font-mono text-xs" value={data.settings.discordGuildId} placeholder="For instant command sync" />
				</div>
				<div>
					<label class="label" for="discordChannelId">Announcement channel ID</label>
					<input id="discordChannelId" name="discordChannelId" class="input font-mono text-xs" value={data.settings.discordChannelId} placeholder="Channel for upload announcements" />
				</div>
				<div>
					<label class="label" for="discordCollectionId">Uploads collection</label>
					<CollectionPicker
						name="discordCollectionId"
						value={data.settings.discordCollectionId}
						collections={data.botCollections}
						placeholder="No collection"
					/>
					<p class="hint">Collection for bot uploads, owned by the selected uploads owner. Create or edit collections in the dashboard.</p>
				</div>
				<div>
					<label class="label" for="botOwnerId">Uploads owned by</label>
					<Select
						id="botOwnerId"
						name="botOwnerId"
						value={data.settings.botOwnerId ? String(data.settings.botOwnerId) : ''}
						options={botOwnerOptions}
					/>
				</div>
				<label class="flex cursor-pointer items-center justify-between gap-5 self-end rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-4 py-2.5">
					<span class="text-sm">Announce uploads in channel</span>
					<input type="checkbox" name="discordAnnounce" value="1" checked={data.settings.discordAnnounce} class="sr-only" />
					<span class="switch"></span>
				</label>
				<label class="flex cursor-pointer items-center justify-between gap-5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-4 py-2.5">
					<span>
						<span class="block text-sm">Server install</span>
						<span class="mt-0.5 block text-[11px] text-[rgb(var(--fg-subtle))]">Commands in servers where the bot is installed.</span>
					</span>
					<input type="checkbox" name="discordGuildInstall" value="1" checked={data.settings.discordGuildInstall} class="sr-only" />
					<span class="switch"></span>
				</label>
				<label class="flex cursor-pointer items-center justify-between gap-5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-4 py-2.5">
					<span>
						<span class="block text-sm">User install (DMs)</span>
						<span class="mt-0.5 block text-[11px] text-[rgb(var(--fg-subtle))]">Requires User Install enabled in the Discord Developer Portal. Commands work in DMs, group DMs and other servers; all replies become ephemeral.</span>
					</span>
					<input type="checkbox" name="discordUserInstall" value="1" checked={data.settings.discordUserInstall} class="sr-only" />
					<span class="switch"></span>
				</label>
			</div>
			<p class="mt-3 text-[11px] text-[rgb(var(--fg-subtle))]">
				The bot is launched by
				<code class="rounded bg-[rgb(var(--surface-2))] px-1.5 py-0.5">npm run start</code>
				(web + bot), or separately with
				<code class="rounded bg-[rgb(var(--surface-2))] px-1.5 py-0.5">npm run start:bot</code>.
				Restart it after saving changes. Install-mode changes are synced automatically on the next bot start (or run
				<code class="rounded bg-[rgb(var(--surface-2))] px-1.5 py-0.5">npm run bot:register</code>).
				Global user-install commands can take up to an hour to appear.
			</p>
		</div>

		<div class="flex justify-end">
			<button class="btn-primary" type="submit"><Icon name="check" size={15} /> Save instance settings</button>
		</div>
	</form>

{:else if tab === 'moderation'}
	<div class="mt-6 space-y-6">
		<div class="card-flat overflow-hidden">
			<div class="flex items-center justify-between border-b border-[rgb(var(--border))] px-4 py-3">
				<h2 class="text-sm font-semibold">Reports</h2>
				<span class="badge">{openReports.length} open</span>
			</div>
			{#if data.reports.length}
				<ul class="divide-y divide-[rgb(var(--border))]">
					{#each data.reports as report (report.id)}
						<li class="p-5">
							<div class="flex flex-wrap items-start gap-3">
								<div class="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[rgb(var(--surface-3))]">
									<img src="/t/{report.file_id}" alt="" class="h-full w-full object-cover" />
								</div>
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<a href="/dashboard/images/{report.file_id}" class="truncate text-sm font-semibold hover:text-accent">{report.original_name}</a>
										<span class="badge {report.status === 'open' ? 'badge-warning' : ''}">{report.status}</span>
									</div>
									<p class="mt-1 text-xs text-[rgb(var(--fg-muted))]">“{report.reason}”</p>
									<p class="mt-1 text-[10px] text-[rgb(var(--fg-subtle))]">
										{report.reporter ? `Reported by @${report.reporter}` : 'Reported by a guest'} · {timeAgo(report.created_at)}
									</p>
								</div>
								<div class="flex flex-wrap items-center gap-1.5">
									<form method="POST" action="?/moderateFile" use:enhance>
										<input type="hidden" name="fileId" value={report.file_id} />
										<input type="hidden" name="action" value="hide" />
										<button class="btn-secondary btn-sm" type="submit"><Icon name="eyeoff" size={13} /> Hide</button>
									</form>
									<form method="POST" action="?/resolveReport" use:enhance>
										<input type="hidden" name="id" value={report.id} />
										<input type="hidden" name="status" value={report.status === 'open' ? 'resolved' : 'open'} />
										<button class="btn-ghost btn-sm" type="submit">{report.status === 'open' ? 'Resolve' : 'Reopen'}</button>
									</form>
									<form method="POST" action="?/moderateFile" use:confirmSubmit={{ title: 'Delete this file permanently?', message: 'The file is removed from disk and every share link is revoked.', confirmLabel: 'Delete file' }}>
										<input type="hidden" name="fileId" value={report.file_id} />
										<input type="hidden" name="action" value="delete" />
										<button class="btn-ghost btn-sm text-red-400" type="submit"><Icon name="trash" size={13} /></button>
									</form>
								</div>
							</div>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="px-4 py-10 text-center text-sm text-[rgb(var(--fg-subtle))]">No reports have been filed. Nice and quiet.</p>
			{/if}
		</div>

		<div class="card-flat overflow-hidden">
			<div class="border-b border-[rgb(var(--border))] px-4 py-3">
				<h2 class="text-sm font-semibold">Audit log</h2>
			</div>
			<ul class="max-h-[420px] divide-y divide-[rgb(var(--border))] overflow-y-auto">
				{#each data.audit as entry (entry.id)}
					<li class="flex items-center gap-3 px-4 py-2.5 text-xs">
						<Icon name="clock" size={13} class="shrink-0 text-[rgb(var(--fg-subtle))]" />
						<span class="font-mono text-[11px] text-accent">{entry.action}</span>
						<span class="min-w-0 flex-1 truncate text-[rgb(var(--fg-muted))]">{entry.meta ?? ''}</span>
						<span class="shrink-0 text-[rgb(var(--fg-subtle))]">{entry.username ?? 'system'} · {timeAgo(entry.created_at)}</span>
					</li>
				{/each}
			</ul>
		</div>
	</div>

{:else if tab === 'integrations'}
	<div class="mt-6 space-y-6">
		<div class="card-flat p-6">
			<div class="flex flex-wrap items-start justify-between gap-5">
				<div class="flex items-center gap-3">
					<span class="flex h-11 w-11 items-center justify-center rounded-xl bg-[#5865F2]/15 text-[#5865F2]"><Icon name="discord" size={23} /></span>
					<div>
						<h2 class="text-sm font-semibold">Nimbus Discord bot</h2>
						<p class="mt-0.5 text-xs text-[rgb(var(--fg-subtle))]">
							{#if botOnline}Online as {data.settings.botTag || 'bot'} · heartbeat {timeAgo(data.settings.botHeartbeat)}{:else}Offline{data.settings.botHeartbeat ? ` · last seen ${timeAgo(data.settings.botHeartbeat)}` : ' · never connected'}{/if}
						</p>
					</div>
				</div>
				<span class="badge {botOnline ? 'badge-success' : 'badge-warning'}"><span class="h-1.5 w-1.5 rounded-full {botOnline ? 'bg-emerald-400' : 'bg-amber-400'}"></span> {botOnline ? 'Connected' : 'Not connected'}</span>
			</div>

			<div class="mt-4 grid gap-3 sm:grid-cols-2">
				<div class="panel p-4">
					<p class="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--fg-subtle))]">Application ID</p>
					<p class="mt-1 truncate font-mono text-xs">{data.settings.discordClientId || 'Not configured'}</p>
				</div>
				<div class="panel p-4">
					<p class="text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--fg-subtle))]">Guild</p>
					<p class="mt-1 truncate font-mono text-xs">{data.settings.discordGuildId || 'Global commands'}</p>
				</div>
			</div>

			<div class="mt-3 flex flex-wrap gap-2">
				<span class="badge {data.settings.discordGuildInstall ? 'badge-success' : ''}">
					<Icon name="users" size={11} /> Server install {data.settings.discordGuildInstall ? 'on' : 'off'}
				</span>
				<span class="badge {data.settings.discordUserInstall ? 'badge-success' : ''}">
					<Icon name="user" size={11} /> User install {data.settings.discordUserInstall ? 'on — ephemeral replies' : 'off'}
				</span>
			</div>

			{#if data.settings.discordGuildInstall && inviteUrl}
				<div class="mt-4">
					<p class="label">Server install link</p>
					<div class="flex items-center gap-2">
						<code class="min-w-0 flex-1 truncate rounded-lg bg-[rgb(var(--surface-2))] px-2.5 py-2 text-[11px]">{inviteUrl}</code>
						<CopyButton text={inviteUrl} iconOnly />
						<a href={inviteUrl} target="_blank" rel="noreferrer" class="btn-secondary btn-sm">Invite</a>
					</div>
				</div>
			{/if}

			{#if data.settings.discordUserInstall && userInviteUrl}
				<div class="mt-3">
					<p class="label">User install link (DMs)</p>
					<div class="flex items-center gap-2">
						<code class="min-w-0 flex-1 truncate rounded-lg bg-[rgb(var(--surface-2))] px-2.5 py-2 text-[11px]">{userInviteUrl}</code>
						<CopyButton text={userInviteUrl} iconOnly />
						<a href={userInviteUrl} target="_blank" rel="noreferrer" class="btn-secondary btn-sm">Install</a>
					</div>
					<p class="hint">Install this as a user app to use commands in DMs, group DMs and servers you're in.</p>
				</div>
			{/if}

			<div class="mt-4">
				<p class="label">Bot API secret</p>
				<div class="flex items-center gap-2">
					<code class="min-w-0 flex-1 truncate rounded-lg bg-[rgb(var(--surface-2))] px-2.5 py-2 text-[11px]">{data.settings.botSecret}</code>
					<CopyButton text={data.settings.botSecret} iconOnly />
					<form method="POST" action="?/regenerateBotSecret" use:confirmSubmit={{ title: 'Regenerate the bot secret?', message: 'The running bot picks up the new secret immediately; any other integrations using the old one will stop working.', confirmLabel: 'Regenerate' }}>
						<button class="btn-ghost btn-sm" type="submit"><Icon name="refresh" size={13} /> Rotate</button>
					</form>
				</div>
				<p class="hint">The bot uses this to upload through the HTTP API. Keep it private.</p>
			</div>

			<a href="?tab=settings" class="btn-secondary btn-sm mt-4" onclick={() => setTab('settings')}><Icon name="settings" size={14} /> Configure token &amp; channels</a>
		</div>

		<div class="card-flat p-6">
			<h2 class="text-sm font-semibold">Bot commands</h2>
			<div class="mt-3 grid gap-2 sm:grid-cols-2">
				{#each [{ cmd: '/upload', text: 'Attach a file — returns a direct URL and Markdown.' }, { cmd: '/gif', text: 'Convert one image into a static .gif file.' }, { cmd: '/share', text: 'Create an expiring, password-protected share link.' }, { cmd: '/recent', text: 'Show the latest public uploads.' }, { cmd: '/stats', text: 'Instance statistics and storage usage.' }, { cmd: '/shorten', text: 'Create a short link for any URL.' }, { cmd: '/delete', text: 'Delete one of your uploads by ID.' }] as command (command.cmd)}
					<div class="panel p-4">
						<code class="text-xs font-semibold text-accent">{command.cmd}</code>
						<p class="mt-1 text-[11px] leading-relaxed text-[rgb(var(--fg-muted))]">{command.text}</p>
					</div>
				{/each}
			</div>
			<p class="mt-3 text-xs text-[rgb(var(--fg-muted))]">
				<code class="rounded bg-[rgb(var(--surface-2))] px-1.5 py-0.5">npm run start</code>
				launches the web server and bot together. Register slash commands with
				<code class="rounded bg-[rgb(var(--surface-2))] px-1.5 py-0.5">npm run bot:register</code>.
			</p>
		</div>
	</div>
{/if}
