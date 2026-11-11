<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Select from '$lib/components/Select.svelte';
	import CollectionPicker from '$lib/components/CollectionPicker.svelte';
	import type { SelectOption } from '$lib/types';
	import { confirmSubmit } from '$lib/actions/confirmSubmit';
	import { toast } from '$lib/stores/ui';
	import {
		accent,
		applyAccent,
		applyTheme,
		reducedMotion,
		setReducedMotion,
		theme
	} from '$lib/stores/ui';
	import { formatBytes, formatDate, timeAgo } from '$lib/utils/format';

	let { data, form }: { data: PageData; form: (ActionData & Record<string, any>) | null } = $props();

	type Tab = 'profile' | 'security' | 'api' | 'appearance';
	let tab = $state<Tab>('profile');

	let avatarPreview = $state(data.user.avatar_url ?? '');
	let avatarFileId = $state(data.user.avatar_file_id ?? '');
	let avatarUploading = $state(false);
	let avatarInput: HTMLInputElement | undefined = $state();

	let sharexKey = $state('');
	let sharexCollection = $state('');
	let sharexVisibility = $state<'public' | 'unlisted' | 'private'>('private');

	const sharexVisibilityOptions: SelectOption[] = [
		{ value: 'public', label: 'Public — listed in Explore', icon: 'globe' },
		{ value: 'unlisted', label: 'Unlisted — links & folders only', icon: 'link' },
		{ value: 'private', label: 'Private — owner only', icon: 'lock' }
	];

	const tabs = [
		{ id: 'profile', label: 'Profile', icon: 'user' },
		{ id: 'security', label: 'Security', icon: 'shield' },
		{ id: 'api', label: 'API keys', icon: 'key' },
		{ id: 'appearance', label: 'Appearance', icon: 'sun' }
	] as const;

	const accents = ['#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#10b981', '#0ea5e9'];

	function deviceLabel(ua: string | null): string {
		if (!ua) return 'Unknown device';
		const os = /Windows/.test(ua)
			? 'Windows'
			: /Mac OS X|Macintosh/.test(ua)
				? 'macOS'
				: /Android/.test(ua)
					? 'Android'
					: /iPhone|iPad/.test(ua)
						? 'iOS'
						: /Linux/.test(ua)
							? 'Linux'
							: 'Unknown OS';
		const browser = /Edg\//.test(ua)
			? 'Edge'
			: /Chrome\//.test(ua)
				? 'Chrome'
				: /Firefox\//.test(ua)
					? 'Firefox'
					: /Safari\//.test(ua)
						? 'Safari'
						: 'Browser';
		return `${browser} on ${os}`;
	}

	async function uploadAvatar(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			toast('Choose an image file for your avatar', 'error');
			return;
		}
		avatarUploading = true;
		try {
			const body = new FormData();
			body.append('file', file);
			body.append('isPublic', '0');
			const response = await fetch('/api/upload', { method: 'POST', body });
			const json = (await response.json()) as { ok?: boolean; error?: string; file?: { id: string }; url?: string };
			if (!response.ok || !json.ok || !json.file) {
				toast(json.error ?? 'Avatar upload failed', 'error');
				return;
			}
			avatarFileId = json.file.id;
			avatarPreview = json.url ?? `/i/${json.file.id}`;
			toast('Avatar uploaded — save your profile to apply it', 'success');
		} finally {
			avatarUploading = false;
			input.value = '';
		}
	}

	function removeAvatar() {
		avatarFileId = 'none';
		avatarPreview = '';
	}

	function downloadSharexConfig() {
		const key = sharexKey.trim();
		if (!key) {
			toast('Paste an API key first', 'error', 'Generate one above, then copy it immediately.');
			return;
		}
		if (!/^nmb_[0-9a-f]{48}$/i.test(key)) {
			toast(
				'Use the full API key shown when it was created',
				'error',
				'Do not use the shortened prefix from the key list.'
			);
			return;
		}
		const collection = data.collections.find((entry) => entry.id === sharexCollection);
		const displayName = collection?.name ?? 'Uploads';
		const args: Record<string, string> = { visibility: sharexVisibility };
		if (collection) args.collectionId = collection.id;
		const config = {
			Version: '17.0.0',
			Name: `Nimbus — ${displayName}`,
			DestinationType: 'ImageUploader, FileUploader',
			RequestMethod: 'POST',
			RequestURL: `${data.base}/api/upload`,
			Headers: { Authorization: `Bearer ${key}` },
			Body: 'MultipartFormData',
			Arguments: args,
			FileFormName: 'file',
			ResponseType: 'JSON',
			URL: '{json:absoluteUrl}',
			ThumbnailURL: '{json:absoluteThumbUrl}',
			ErrorMessage: '{json:error}'
		};
		const blob = new Blob([JSON.stringify(config, null, 2)], {
			type: 'application/json'
		});
		const href = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = href;
		link.download = `nimbus-${displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.sxcu`;
		link.click();
		URL.revokeObjectURL(href);
		toast('ShareX config downloaded', 'success');
	}
</script>

<svelte:head><title>Settings · {data.site.siteName}</title></svelte:head>

<div>
	<h1 class="page-title">Settings</h1>
	<p class="mt-1 text-sm text-[rgb(var(--fg-muted))]">Manage your profile, security and integrations.</p>
</div>

{#if form?.profileError || form?.passwordError || form?.deleteError || form?.securityError}
	<div class="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
		{form.profileError ?? form.passwordError ?? form.deleteError ?? form.securityError}
	</div>
{/if}
{#if form?.profileSuccess || form?.passwordSuccess || form?.securitySuccess}
	<div class="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">
		{form.profileSuccess ?? form.passwordSuccess ?? form.securitySuccess}
	</div>
{/if}

<div class="mt-7 grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
	<nav class="card-flat flex gap-1 overflow-x-auto p-2 lg:flex-col">
		{#each tabs as item (item.id)}
			<button
				class="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition {tab === item.id
					? 'bg-accent/10 text-accent'
					: 'text-[rgb(var(--fg-muted))] hover:bg-[rgb(var(--surface-2))]'}"
				onclick={() => (tab = item.id)}
			>
				<Icon name={item.icon} size={15} /> {item.label}
			</button>
		{/each}
		{#if data.user.role === 'admin'}
			<a href="/dashboard/admin" class="mt-1 hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--fg-muted))] hover:bg-[rgb(var(--surface-2))] lg:flex">
				<Icon name="discord" size={15} /> Integrations
			</a>
		{/if}
	</nav>

	<div class="space-y-6">
		{#if tab === 'profile'}
			<form method="POST" action="?/profile" use:enhance class="card-flat p-6">
				<h2 class="text-sm font-semibold">Public profile</h2>
				<p class="mt-1 text-xs text-[rgb(var(--fg-muted))]">This information is visible on your profile page and public uploads.</p>

				<div class="mt-5 flex items-center gap-4">
					<Avatar name={data.user.username} src={avatarPreview || null} size={64} />
					<div>
						<div class="flex flex-wrap gap-2">
							<button type="button" class="btn-secondary btn-sm" onclick={() => avatarInput?.click()} disabled={avatarUploading}>
								{#if avatarUploading}<Icon name="spinner" size={13} class="animate-spin" /> Uploading…{:else}<Icon name="upload" size={13} /> Change avatar{/if}
							</button>
							{#if avatarPreview}
								<button type="button" class="btn-ghost btn-sm" onclick={removeAvatar}>Remove</button>
							{/if}
						</div>
						<p class="mt-1.5 text-[11px] text-[rgb(var(--fg-subtle))]">PNG, JPG or WEBP. The image is stored privately in your library.</p>
					</div>
					<input bind:this={avatarInput} type="file" accept="image/*" class="hidden" onchange={uploadAvatar} />
					<input type="hidden" name="avatarFileId" value={avatarFileId} />
				</div>

				<div class="mt-5 grid gap-5 sm:grid-cols-2">
					<div>
						<label class="label" for="username">Username</label>
						<input id="username" name="username" class="input" value={data.user.username} minlength="3" maxlength="24" required />
						<p class="hint">Your public URL: /u/{data.user.username}</p>
					</div>
					<div>
						<label class="label" for="email">Email</label>
						<input id="email" name="email" type="email" class="input" value={data.user.email} required />
						<p class="hint">Used only for signing in.</p>
					</div>
					<div class="sm:col-span-2">
						<label class="label" for="bio">Bio</label>
						<textarea id="bio" name="bio" class="textarea min-h-[84px]" maxlength="300" placeholder="Tell people a little about yourself…">{data.user.bio}</textarea>
					</div>
				</div>

				<div class="mt-4 flex items-center justify-between">
					<p class="text-[11px] text-[rgb(var(--fg-subtle))]">Member since {formatDate(data.user.created_at)}</p>
					<button class="btn-primary btn-sm" type="submit"><Icon name="check" size={14} /> Save profile</button>
				</div>
			</form>

			<div class="card-flat p-6">
				<h2 class="text-sm font-semibold">Storage usage</h2>
				<div class="mt-3 flex items-end justify-between">
					<p class="text-2xl font-bold">{formatBytes(data.stats.size)}</p>
					<p class="text-xs text-[rgb(var(--fg-subtle))]">{data.quota > 0 ? `of ${formatBytes(data.quota)}` : 'Unlimited'}</p>
				</div>
				{#if data.quota > 0}
					<div class="mt-3 h-2 overflow-hidden rounded-full bg-[rgb(var(--surface-3))]">
						<div class="h-full rounded-full bg-gradient-to-r from-accent to-fuchsia-500" style="width:{Math.min(100, Math.round((data.stats.size / data.quota) * 100))}%"></div>
					</div>
				{/if}
				<div class="mt-4 grid grid-cols-3 gap-2 text-center">
					<div class="rounded-xl bg-[rgb(var(--surface-2))] py-2.5"><p class="text-sm font-bold">{data.stats.count}</p><p class="text-[10px] uppercase text-[rgb(var(--fg-subtle))]">Files</p></div>
					<div class="rounded-xl bg-[rgb(var(--surface-2))] py-2.5"><p class="text-sm font-bold">{data.stats.views}</p><p class="text-[10px] uppercase text-[rgb(var(--fg-subtle))]">Views</p></div>
					<div class="rounded-xl bg-[rgb(var(--surface-2))] py-2.5"><p class="text-sm font-bold">{data.stats.shares}</p><p class="text-[10px] uppercase text-[rgb(var(--fg-subtle))]">Shares</p></div>
				</div>
			</div>

		{:else if tab === 'security'}
			<form method="POST" action="?/password" use:enhance class="card-flat p-6">
				<h2 class="text-sm font-semibold">Change password</h2>
				<div class="mt-5 grid gap-4 sm:grid-cols-3">
					<div>
						<label class="label" for="current">Current</label>
						<input id="current" name="current" type="password" class="input" autocomplete="current-password" required />
					</div>
					<div>
						<label class="label" for="next">New password</label>
						<input id="next" name="next" type="password" class="input" minlength="8" autocomplete="new-password" required />
					</div>
					<div>
						<label class="label" for="confirm">Confirm</label>
						<input id="confirm" name="confirm" type="password" class="input" minlength="8" autocomplete="new-password" required />
					</div>
				</div>
				<div class="mt-4 flex justify-end">
					<button class="btn-primary btn-sm" type="submit"><Icon name="lock" size={14} /> Update password</button>
				</div>
			</form>

			<div class="card-flat p-6">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-sm font-semibold">Active sessions</h2>
						<p class="mt-0.5 text-xs text-[rgb(var(--fg-muted))]">Devices currently signed in to your account.</p>
					</div>
					{#if data.sessions.length > 1}
						<form method="POST" action="?/revokeOtherSessions" use:enhance>
							<button class="btn-ghost btn-sm text-red-400" type="submit">Sign out others</button>
						</form>
					{/if}
				</div>
				<ul class="mt-3 divide-y divide-[rgb(var(--border))]">
					{#each data.sessions as session (session.id)}
						<li class="flex flex-wrap items-center gap-3 py-3">
							<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgb(var(--surface-2))] text-[rgb(var(--fg-subtle))]"><Icon name="globe" size={15} /></span>
							<div class="min-w-0 flex-1">
								<p class="text-xs font-medium">
									{deviceLabel(session.user_agent)}
									{#if session.id === data.currentSessionId}<span class="badge badge-success ml-1">This device</span>{/if}
								</p>
								<p class="text-[10px] text-[rgb(var(--fg-subtle))]">
									{session.ip ?? 'unknown IP'} · started {timeAgo(session.created_at)} · expires {formatDate(session.expires_at)}
								</p>
							</div>
							<form method="POST" action="?/revokeSession" use:confirmSubmit={{ title: 'Sign out this session?', message: 'That device will need to sign in again.', confirmLabel: 'Sign out' }}>
								<input type="hidden" name="id" value={session.id} />
								<button class="btn-ghost btn-sm text-red-400" type="submit">Sign out</button>
							</form>
						</li>
					{/each}
				</ul>
			</div>

			<div class="card-flat border-red-500/20 p-5">
				<h2 class="text-sm font-semibold text-red-400">Delete account</h2>
				<p class="mt-1 text-xs text-[rgb(var(--fg-muted))]">
					Your uploads will be hidden and your account permanently removed. This cannot be undone.
				</p>
				<form method="POST" action="?/deleteAccount" use:confirmSubmit={{ title: 'Delete your account?', message: 'Your files are removed from disk and every session is signed out. This cannot be undone.', confirmLabel: 'Delete my account' }} class="mt-3 flex flex-wrap gap-2">
					<input name="password" type="password" class="input max-w-xs" placeholder="Confirm your password" required />
					<button class="btn-danger btn-sm" type="submit"><Icon name="trash" size={14} /> Delete my account</button>
				</form>
			</div>

		{:else if tab === 'api'}
			{#if form?.newKey}
				<div class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
					<div class="flex items-center gap-2 text-sm font-semibold text-emerald-400"><Icon name="key" size={15} /> API key “{form.keyName}” created</div>
					<p class="mt-1 text-xs text-emerald-400/80">Copy it now — it will never be shown again.</p>
					<div class="mt-2 flex items-center gap-2">
						<code class="min-w-0 flex-1 truncate rounded-lg bg-black/30 px-2.5 py-2 text-[11px] text-emerald-300">{form.newKey}</code>
						<CopyButton text={form.newKey} iconOnly />
					</div>
				</div>
			{/if}

			<div class="card-flat p-6">
				<h2 class="text-sm font-semibold">API keys</h2>
				<p class="mt-1 text-xs text-[rgb(var(--fg-muted))]">Use keys to upload from scripts, ShareX or the Discord bot.</p>
				<form method="POST" action="?/createKey" use:enhance class="mt-3 flex flex-wrap gap-2">
					<input name="name" class="input max-w-xs" placeholder="Key name (e.g. ShareX)" maxlength="60" />
					<button class="btn-primary btn-sm" type="submit"><Icon name="plus" size={14} /> Generate key</button>
				</form>

				{#if data.apiKeys.length}
					<ul class="mt-4 divide-y divide-[rgb(var(--border))]">
						{#each data.apiKeys as key (key.id)}
							<li class="flex flex-wrap items-center gap-3 py-3">
								<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgb(var(--surface-2))] text-accent"><Icon name="key" size={14} /></span>
								<div class="min-w-0 flex-1">
									<p class="text-xs font-medium">{key.name}</p>
									<p class="text-[10px] text-[rgb(var(--fg-subtle))]">
										<span class="font-mono">{key.prefix}…</span> · created {formatDate(key.created_at)}
										{#if key.last_used_at}· last used {timeAgo(key.last_used_at)}{:else}· never used{/if}
									</p>
								</div>
								<form method="POST" action="?/revokeKey" use:enhance>
									<input type="hidden" name="id" value={key.id} />
									<button class="btn-ghost btn-sm text-red-400" type="submit">Revoke</button>
								</form>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="mt-4 rounded-xl bg-[rgb(var(--surface-2))] px-3 py-5 text-center text-xs text-[rgb(var(--fg-subtle))]">No API keys yet.</p>
				{/if}
			</div>

			<div class="card-flat p-6">
				<h2 class="text-sm font-semibold">Quick reference</h2>
				<div class="mt-3 space-y-3 text-xs">
					<div>
						<p class="mb-1 font-medium text-[rgb(var(--fg-muted))]">Upload a file</p>
						<pre class="overflow-x-auto rounded-xl bg-[#06070b] p-3 font-mono text-[11px] leading-relaxed text-[rgb(var(--fg-muted))]">curl -F "file=@screenshot.png" \
  -H "Authorization: Bearer nmb_…" \
  {data.base}/api/upload</pre>
					</div>
					<div>
						<p class="mb-1 font-medium text-[rgb(var(--fg-muted))]">Generate a GIF</p>
						<pre class="overflow-x-auto rounded-xl bg-[#06070b] p-3 font-mono text-[11px] leading-relaxed text-[rgb(var(--fg-muted))]">curl -F "frames=@one.png" -F "frames=@two.png" \
  -F "delay=90" -F "effect=none" \
  -H "Authorization: Bearer nmb_…" \
  {data.base}/api/gif</pre>
					</div>
					<div>
						<p class="mb-1 font-medium text-[rgb(var(--fg-muted))]">Create a share link</p>
						<pre class="overflow-x-auto rounded-xl bg-[#06070b] p-3 font-mono text-[11px] leading-relaxed text-[rgb(var(--fg-muted))]">curl -X POST {data.base}/api/shares \
  -H "Authorization: Bearer nmb_…" \
  -H "content-type: application/json" \
  -d '{{"fileId":"abc123","expiresInHours":24}}'</pre>
					</div>
				</div>
			</div>

			<div class="card-flat p-6">
				<h2 class="text-sm font-semibold">ShareX config</h2>
				<p class="mt-1 text-xs text-[rgb(var(--fg-muted))]">
					Generate a <code>.sxcu</code> custom uploader that puts screenshots in a chosen collection.
					The collection is created automatically on the first upload.
				</p>
				<div class="mt-4 grid gap-3 sm:grid-cols-2">
					<div>
						<label class="label" for="sharexKey">API key</label>
						<input id="sharexKey" type="password" class="input font-mono text-xs" bind:value={sharexKey} placeholder="nmb_… (shown once when created)" autocomplete="off" />
					</div>
					<div>
						<label class="label">Collection / folder</label>
						<CollectionPicker bind:value={sharexCollection} collections={data.collections} placeholder="No collection" />
					</div>
					<div>
						<label class="label">Visibility</label>
						<Select bind:value={sharexVisibility} options={sharexVisibilityOptions} />
					</div>
					<div class="flex items-end">
						<button class="btn-primary btn-sm w-full" onclick={downloadSharexConfig} type="button">
							<Icon name="download" size={14} /> Download .sxcu
						</button>
					</div>
				</div>
				<p class="hint">
					The API key is only used in your browser to build the file. Screenshots land in the selected collection.
					{#if !data.collections.length}
						Create a collection first from <a href="/dashboard/collections" class="text-accent hover:underline">Collections</a>.
					{/if}
				</p>
			</div>

		{:else if tab === 'appearance'}
			<div class="card-flat p-6">
				<h2 class="text-sm font-semibold">Theme</h2>
				<p class="mt-1 text-xs text-[rgb(var(--fg-muted))]">Choose how {data.site.siteName} looks on this device.</p>
				<div class="mt-4 grid gap-3 sm:grid-cols-2">
					<button
						class="rounded-xl border p-4 text-left transition {$theme === 'dark' ? 'border-accent ring-1 ring-accent/40' : 'border-[rgb(var(--border))] hover:border-[rgb(var(--border-strong))]'}"
						onclick={() => applyTheme('dark')}
					>
						<div class="mb-2 flex h-16 items-center justify-center rounded-lg bg-[#08090e]">
							<div class="h-8 w-20 rounded-md bg-[#141722] ring-1 ring-white/10"></div>
						</div>
						<p class="text-sm font-semibold">Dark</p>
						<p class="text-[11px] text-[rgb(var(--fg-subtle))]">Easy on the eyes at night.</p>
					</button>
					<button
						class="rounded-xl border p-4 text-left transition {$theme === 'light' ? 'border-accent ring-1 ring-accent/40' : 'border-[rgb(var(--border))] hover:border-[rgb(var(--border-strong))]'}"
						onclick={() => applyTheme('light')}
					>
						<div class="mb-2 flex h-16 items-center justify-center rounded-lg bg-[#f6f7fb]">
							<div class="h-8 w-20 rounded-md bg-white ring-1 ring-black/10"></div>
						</div>
						<p class="text-sm font-semibold">Light</p>
						<p class="text-[11px] text-[rgb(var(--fg-subtle))]">Bright and crisp.</p>
					</button>
				</div>

				<h2 class="mt-6 text-sm font-semibold">Accent colour</h2>
				<div class="mt-3 flex flex-wrap gap-2">
					{#each accents as color (color)}
						<button
							class="h-9 w-9 rounded-full ring-offset-2 ring-offset-[rgb(var(--surface))] transition {$accent === color ? 'ring-2 ring-white/70' : 'hover:scale-105'}"
							style="background:{color}"
							onclick={() => applyAccent(color)}
							aria-label="Use accent {color}"
						></button>
					{/each}
					<label class="flex h-9 items-center gap-2 rounded-full border border-[rgb(var(--border-strong))] px-3 text-[11px]">
						Custom
						<input type="color" value={$accent} class="h-5 w-6 cursor-pointer border-0 bg-transparent p-0" oninput={(event) => applyAccent((event.currentTarget as HTMLInputElement).value)} />
					</label>
				</div>

				<div class="mt-6">
					<h2 class="text-sm font-semibold">Motion</h2>
					<label class="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-4 py-3">
						<div>
							<p class="text-sm font-medium">Reduce motion</p>
							<p class="mt-0.5 text-xs text-[rgb(var(--fg-subtle))]">Disable animations and transitions.</p>
						</div>
						<input type="checkbox" checked={$reducedMotion} onchange={(event) => setReducedMotion((event.currentTarget as HTMLInputElement).checked)} class="sr-only" />
						<span class="switch"></span>
					</label>
				</div>
			</div>

			{#if data.user.role === 'admin'}
				<div class="card-flat flex items-center gap-4 p-5">
					<span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5865F2]/15 text-[#5865F2]"><Icon name="discord" size={20} /></span>
					<div class="flex-1">
						<p class="text-sm font-semibold">Discord bot</p>
						<p class="mt-0.5 text-xs text-[rgb(var(--fg-muted))]">Configure the bot token, invite link and upload settings.</p>
					</div>
					<a href="/dashboard/admin?tab=integrations" class="btn-secondary btn-sm">Configure</a>
				</div>
			{/if}
		{/if}
	</div>
</div>
