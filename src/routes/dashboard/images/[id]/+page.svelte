<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Select from '$lib/components/Select.svelte';
	import CollectionPicker from '$lib/components/CollectionPicker.svelte';
	import { confirmSubmit } from '$lib/actions/confirmSubmit';
	import { formatBytes, formatDate, truncate } from '$lib/utils/format';
	import { fileVisibility } from '$lib/visibility';
	import type { SelectOption } from '$lib/types';

	let { data, form }: { data: PageData; form: (ActionData & Record<string, any>) | null } = $props();

	const file = $derived(data.file);
	const isImage = $derived(file.mime.startsWith('image/'));
	const isVideo = $derived(file.mime.startsWith('video/'));
	// Static images use the generated WebP preview. This is smaller, faster and
	// avoids blank previews from exotic JPEG colour spaces in some browsers.
	const previewSrc = $derived(
		file.thumb_path && file.pages <= 1 ? `/t/${file.id}` : `/i/${file.id}`
	);
	const directUrl = $derived(data.directUrl);

	const expiryOptions: SelectOption[] = [
		{ value: '0', label: 'Never expires', icon: 'clock' },
		{ value: '1', label: '1 hour', icon: 'clock' },
		{ value: '24', label: '24 hours', icon: 'clock' },
		{ value: '168', label: '7 days', icon: 'clock' },
		{ value: '720', label: '30 days', icon: 'clock' }
	];
	const visibilityOptions: SelectOption[] = [
		{ value: 'public', label: 'Public — listed in Explore', icon: 'globe' },
		{ value: 'unlisted', label: 'Unlisted — links & folders only', icon: 'link' },
		{ value: 'private', label: 'Private — only you', icon: 'lock' }
	];

	let visibility = $state(fileVisibility(file));
	let expires = $state('0');
	let selectedCollection = $state('');
</script>

<svelte:head><title>Edit {file.original_name} · {data.site.siteName}</title></svelte:head>

<div class="flex flex-wrap items-start justify-between gap-5">
	<div class="min-w-0">
		<div class="flex items-center gap-2 text-xs text-[rgb(var(--fg-subtle))]">
			<a href="/dashboard/images" class="hover:text-[rgb(var(--fg))]">My images</a>
			<Icon name="chevronRight" size={11} />
			<span class="truncate">{truncate(file.original_name, 40)}</span>
		</div>
		<h1 class="mt-2 truncate page-title">{file.original_name}</h1>
		<p class="mt-1 text-xs text-[rgb(var(--fg-subtle))]">
			{formatBytes(file.size)} · {file.mime}{#if file.width} · {file.width}×{file.height}{/if} · uploaded {formatDate(file.created_at, true)}
		</p>
	</div>
	<div class="flex gap-2">
		<a href="/p/{file.id}" class="btn-secondary btn-sm" target="_blank" rel="noreferrer"><Icon name="eye" size={14} /> View page</a>
		<a href="{directUrl}?download=1" class="btn-primary btn-sm"><Icon name="download" size={14} /> Download</a>
	</div>
</div>

{#if form?.success}
	<div class="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">{form.success}</div>
{/if}
{#if form?.error}
	<div class="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{form.error}</div>
{/if}

<div class="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_410px]">
	<div class="space-y-6">
		<div class="card-flat overflow-hidden">
			<div class="flex min-h-[320px] items-center justify-center bg-[#06070b] p-3">
				{#if isImage}
					<img
						src={previewSrc}
						alt={file.original_name}
						class="max-h-[60vh] w-auto max-w-full rounded-xl object-contain"
						onerror={(event) => {
							const image = event.currentTarget as HTMLImageElement;
							if (image.dataset.fallback) return;
							image.dataset.fallback = '1';
							image.src = `/i/${file.id}`;
						}}
					/>
				{:else if isVideo}
					<video src="/i/{file.id}" controls class="max-h-[60vh] w-full rounded-xl"></video>
				{:else}
					<div class="flex flex-col items-center gap-2 py-12 text-white/60">
						<Icon name="folder" size={30} />
						<span class="text-sm">{file.original_name}</span>
					</div>
				{/if}
			</div>
			<div class="flex flex-wrap items-center gap-2.5 border-t border-[rgb(var(--border))] px-5 py-4">
				<CopyButton text={directUrl} label="Copy direct link" />
				<CopyButton text={`![${file.original_name}](${directUrl})`} label="Markdown" />
				<CopyButton text={`<img src="${directUrl}" alt="${file.original_name}" />`} label="HTML" />
			</div>
		</div>

		<form method="POST" action="?/update" use:enhance class="card-flat p-6">
			<h2 class="text-sm font-semibold">File details</h2>
			<div class="mt-5 space-y-5">
				<div>
					<label class="label" for="name">Display name</label>
					<input id="name" name="name" class="input" value={file.original_name} maxlength="180" />
				</div>
				<div>
					<label class="label" for="tags">Tags</label>
					<input id="tags" name="tags" class="input" value={data.tagsInput} placeholder="artwork, screenshot, wallpaper" />
					<p class="hint">Comma separated. Tags appear in Explore and on the public page.</p>
				</div>
				<div>
					<label class="label" for="visibility">Visibility</label>
					<Select id="visibility" name="visibility" bind:value={visibility} options={visibilityOptions} />
					<p class="hint">
						Public files appear in Explore and Fresh from the community. Unlisted files stay out of those feeds but still work through direct links and public collection or subfolder links. Private files are owner-only.
					</p>
				</div>
				<div class="flex justify-end">
					<button class="btn-primary btn-sm" type="submit"><Icon name="check" size={14} /> Save changes</button>
				</div>
			</div>
		</form>

		<div class="card-flat p-6">
			<h2 class="text-sm font-semibold">Collections</h2>
			<p class="mt-1 text-xs text-[rgb(var(--fg-muted))]">Add this file to one of your collections.</p>
			<form method="POST" action="?/addToCollection" use:enhance class="mt-4 space-y-2.5">
				<CollectionPicker
					bind:value={selectedCollection}
					name="collectionId"
					collections={data.collections}
					allowNone={false}
					placeholder="Choose a collection…"
				/>
				<button class="btn-secondary btn-sm w-full" type="submit" disabled={!selectedCollection}>Add to collection</button>
			</form>
			{#if !data.collections.length}
				<p class="mt-2 text-xs text-[rgb(var(--fg-subtle))]">
					No collections yet. <a href="/dashboard/collections" class="text-accent hover:underline">Create one</a>.
				</p>
			{/if}
		</div>
	</div>

	<aside class="space-y-6">
		<div class="card-flat p-6">
			<div class="flex items-center justify-between">
				<h2 class="text-sm font-semibold">Share links</h2>
				<span class="badge">{data.shares.length}</span>
			</div>
			<p class="mt-1 text-xs text-[rgb(var(--fg-muted))]">Create private links with an optional password, expiry or view limit.</p>

			<form method="POST" action="?/createShare" use:enhance class="mt-5 space-y-4">
				<div class="grid grid-cols-2 gap-3">
					<div class="col-span-2">
						<label class="label" for="password">Password <span class="font-normal normal-case text-[rgb(var(--fg-subtle))]">(optional)</span></label>
						<input id="password" name="password" class="input" placeholder="Leave empty for no password" autocomplete="new-password" />
					</div>
					<div>
						<label class="label" for="expires">Expires</label>
						<Select id="expires" name="expiresInHours" bind:value={expires} options={expiryOptions} />
					</div>
					<div>
						<label class="label" for="maxViews">Max views</label>
						<input id="maxViews" name="maxViews" type="number" min="0" class="input" placeholder="0 = unlimited" />
					</div>
				</div>
				<button class="btn-primary btn-sm w-full" type="submit"><Icon name="link" size={14} /> Create share link</button>
			</form>

			{#if form?.created}
				<div class="mt-3 rounded-xl border border-accent/30 bg-accent/5 p-3">
					<p class="text-[11px] font-semibold uppercase tracking-wide text-accent">New link</p>
					<div class="mt-1.5 flex items-center gap-2">
						<code class="min-w-0 flex-1 truncate text-[11px]">{form.created}</code>
						<CopyButton text={form.created} iconOnly />
					</div>
				</div>
			{/if}

			{#if data.shares.length}
				<ul class="mt-5 space-y-3">
					{#each data.shares as share (share.id)}
						<li class="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-3">
							<div class="flex items-center gap-2">
								<a href="/s/{share.slug}" target="_blank" rel="noreferrer" class="min-w-0 flex-1">
									<p class="truncate text-xs font-semibold text-accent">/s/{share.slug}</p>
									<p class="mt-0.5 text-[10px] text-[rgb(var(--fg-subtle))]">
										{share.views} view{share.views === 1 ? '' : 's'}
										{#if share.has_password} · password{/if}
										{#if share.expires_at} · expires {formatDate(share.expires_at)}{/if}
										{#if share.max_views} · max {share.max_views}{/if}
									</p>
								</a>
								<CopyButton text="{data.base}/s/{share.slug}" iconOnly />
								<form method="POST" action="?/revokeShare" use:confirmSubmit={{ title: 'Revoke share link?', message: 'The link will stop working immediately.', confirmLabel: 'Revoke' }}>
									<input type="hidden" name="shareId" value={share.id} />
									<button class="btn-icon h-8 w-8 hover:text-red-400" title="Revoke" type="submit"><Icon name="trash" size={13} /></button>
								</form>
							</div>
						</li>
					{/each}
				</ul>
			{/if}

			{#if data.qr}
				<div class="mt-4 flex flex-col items-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-4 text-center">
					<p class="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[rgb(var(--fg-subtle))]">Scan latest share</p>
					<img src={data.qr} alt="QR code" class="h-36 w-36 rounded-lg bg-white p-1.5" />
				</div>
			{/if}
		</div>

		<div class="card-flat p-6">
			<h2 class="text-sm font-semibold">File information</h2>
			<dl class="mt-4 space-y-3 text-xs">
				<div class="flex justify-between gap-3"><dt class="text-[rgb(var(--fg-subtle))]">File ID</dt><dd class="font-mono text-[11px]">{file.id}</dd></div>
				<div class="flex justify-between gap-3"><dt class="text-[rgb(var(--fg-subtle))]">Size</dt><dd>{formatBytes(file.size)}</dd></div>
				<div class="flex justify-between gap-3"><dt class="text-[rgb(var(--fg-subtle))]">Type</dt><dd>{file.mime}</dd></div>
				{#if file.width && file.height}
					<div class="flex justify-between gap-3"><dt class="text-[rgb(var(--fg-subtle))]">Dimensions</dt><dd>{file.width}×{file.height}</dd></div>
				{/if}
				{#if file.pages > 1}
					<div class="flex justify-between gap-3"><dt class="text-[rgb(var(--fg-subtle))]">Frames</dt><dd>{file.pages}</dd></div>
				{/if}
				<div class="flex justify-between gap-3"><dt class="text-[rgb(var(--fg-subtle))]">Views</dt><dd>{file.views}</dd></div>
				<div class="flex justify-between gap-3"><dt class="text-[rgb(var(--fg-subtle))]">Downloads</dt><dd>{file.downloads}</dd></div>
			</dl>
		</div>

		<div class="card-flat border-red-500/20 p-6">
			<h2 class="text-sm font-semibold text-red-400">Danger zone</h2>
			<p class="mt-1 text-xs text-[rgb(var(--fg-muted))]">Deleting removes the file from disk and revokes every share link.</p>
			<form method="POST" action="?/delete" use:confirmSubmit={{ title: 'Delete this file permanently?', message: 'The file is removed from disk and every share link is revoked. This cannot be undone.', confirmLabel: 'Delete permanently' }} class="mt-3">
				<button class="btn-danger btn-sm w-full" type="submit"><Icon name="trash" size={14} /> Delete permanently</button>
			</form>
		</div>
	</aside>
</div>
