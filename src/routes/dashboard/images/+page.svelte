<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import Icon from '$lib/components/Icon.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import SelectInput from '$lib/components/Select.svelte';
	import type { SelectOption } from '$lib/types';
	import { confirmDialog } from '$lib/stores/confirm';
	import { toast } from '$lib/stores/ui';
	import { copyText, formatBytes, formatDate, formatNumber, timeAgo, truncate } from '$lib/utils/format';
	import { fileVisibility } from '$lib/visibility';

	let { data }: { data: PageData } = $props();

	let view = $state<'grid' | 'list'>('grid');
	let selected = $state<string[]>([]);
	let busy = $state(false);
	let search = $state(data.q);

	const kindOptions: SelectOption[] = [
		{ value: 'all', label: 'All types', icon: 'grid' },
		{ value: 'images', label: 'Images', icon: 'image' },
		{ value: 'files', label: 'Other files', icon: 'folder' }
	];
	const visibilityOptions: SelectOption[] = [
		{ value: 'all', label: 'Any visibility', icon: 'eye' },
		{ value: 'public', label: 'Public', icon: 'globe' },
		{ value: 'unlisted', label: 'Unlisted', icon: 'link' },
		{ value: 'private', label: 'Private', icon: 'lock' }
	];
	const sortOptions: SelectOption[] = [
		{ value: 'new', label: 'Newest', icon: 'clock' },
		{ value: 'old', label: 'Oldest', icon: 'clock' },
		{ value: 'views', label: 'Most viewed', icon: 'eye' },
		{ value: 'size', label: 'Largest', icon: 'database' },
		{ value: 'name', label: 'Name', icon: 'list' }
	];

	onMount(() => {
		const stored = localStorage.getItem('nimbus:image-view');
		if (stored === 'list' || stored === 'grid') view = stored;
	});

	function setView(next: 'grid' | 'list') {
		view = next;
		localStorage.setItem('nimbus:image-view', next);
	}

	function navigate(patch: Record<string, string | undefined>) {
		const params = new URLSearchParams($page.url.searchParams);
		for (const [key, value] of Object.entries(patch)) {
			if (!value) params.delete(key);
			else params.set(key, value);
		}
		params.delete('page');
		goto(`/dashboard/images?${params.toString()}`, { keepFocus: true });
	}

	function submitSearch(event: SubmitEvent) {
		event.preventDefault();
		navigate({ q: search.trim() || undefined });
	}

	function buildHref(p: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', String(p));
		return `?${params.toString()}`;
	}

	function toggle(id: string) {
		selected = selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id];
	}

	function toggleAll() {
		selected = selected.length === data.files.length ? [] : data.files.map((file) => file.id);
	}

	async function copyLink(id: string) {
		const file = data.files.find((entry) => entry.id === id);
		const extension = data.directLinks && file?.ext ? `.${file.ext}` : '';
		const ok = await copyText(`${location.origin}/i/${id}${extension}`);
		toast(ok ? 'Link copied' : 'Could not access clipboard', ok ? 'success' : 'error');
	}

	async function bulk(action: 'public' | 'unlisted' | 'private' | 'delete') {
		if (!selected.length || busy) return;
		if (
			action === 'delete' &&
			!(await confirmDialog({
				title: `Delete ${selected.length} file${selected.length === 1 ? '' : 's'}?`,
				message: 'The files are removed from disk and their share links are revoked. This cannot be undone.',
				confirmLabel: 'Delete files'
			}))
		)
			return;
		busy = true;
		let failures = 0;
		for (const id of selected) {
			const response =
				action === 'delete'
					? await fetch(`/api/files/${id}`, { method: 'DELETE' })
					: await fetch(`/api/files/${id}`, {
							method: 'PATCH',
							headers: { 'content-type': 'application/json' },
							body: JSON.stringify({ visibility: action })
						});
			if (!response.ok) failures++;
		}
		busy = false;
		selected = [];
		await invalidateAll();
		toast(
			failures ? `${failures} action(s) failed` : action === 'delete' ? 'Files deleted' : 'Visibility updated',
			failures ? 'error' : 'success'
		);
	}

	async function removeOne(id: string) {
		if (
			!(await confirmDialog({
				title: 'Delete this file?',
				message: 'It will be removed from disk and its share links revoked. This cannot be undone.',
				confirmLabel: 'Delete file'
			}))
		)
			return;
		const response = await fetch(`/api/files/${id}`, { method: 'DELETE' });
		if (response.ok) {
			toast('File deleted', 'success');
			await invalidateAll();
		} else {
			toast('Could not delete the file', 'error');
		}
	}

	async function toggleVisibility(id: string, makePublic: boolean) {
		const response = await fetch(`/api/files/${id}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ isPublic: makePublic })
		});
		if (response.ok) {
			toast(makePublic ? 'File is now public' : 'File is now private', 'success');
			await invalidateAll();
		} else {
			toast('Could not update visibility', 'error');
		}
	}
</script>

<svelte:head><title>My images · {data.site.siteName}</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-5">
	<div>
		<h1 class="page-title">My images</h1>
		<p class="mt-1 text-sm text-[rgb(var(--fg-muted))]">
			{formatNumber(data.total)} file{data.total === 1 ? '' : 's'} · {formatBytes(data.stats.size)} used
			{#if data.quota > 0} of {formatBytes(data.quota)}{/if}
		</p>
	</div>
	<a href="/dashboard/upload" class="btn-primary btn-sm"><Icon name="upload" size={14} /> Upload</a>
</div>

<div class="card-flat mt-6 flex flex-wrap items-center gap-2.5 p-3.5">
	<form class="relative min-w-[200px] flex-1" onsubmit={submitSearch}>
		<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--fg-subtle))]"><Icon name="search" size={15} /></span>
		<input class="input h-11 py-2 pl-9 text-xs" placeholder="Search your uploads…" bind:value={search} aria-label="Search your files" />
	</form>

	<SelectInput class="w-36" value={data.kind} options={kindOptions} onchange={(value) => navigate({ kind: value })} />
	<SelectInput class="w-40" value={data.visibility} options={visibilityOptions} onchange={(value) => navigate({ visibility: value })} />
	<SelectInput class="w-36" value={data.sort} options={sortOptions} onchange={(value) => navigate({ sort: value })} />

	<div class="ml-auto flex rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-0.5">
		<button class="rounded-md p-1.5 {view === 'grid' ? 'bg-[rgb(var(--surface))] text-accent shadow-sm' : 'text-[rgb(var(--fg-subtle))]'}" onclick={() => setView('grid')} aria-label="Grid view">
			<Icon name="grid" size={15} />
		</button>
		<button class="rounded-md p-1.5 {view === 'list' ? 'bg-[rgb(var(--surface))] text-accent shadow-sm' : 'text-[rgb(var(--fg-subtle))]'}" onclick={() => setView('list')} aria-label="List view">
			<Icon name="list" size={15} />
		</button>
	</div>
</div>

{#if selected.length}
	<div class="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
		<span class="text-xs font-semibold text-accent">{selected.length} selected</span>
		<button class="btn-secondary btn-sm" onclick={() => bulk('public')} disabled={busy}><Icon name="globe" size={13} /> Make public</button>
		<button class="btn-secondary btn-sm" onclick={() => bulk('unlisted')} disabled={busy}><Icon name="link" size={13} /> Make unlisted</button>
		<button class="btn-secondary btn-sm" onclick={() => bulk('private')} disabled={busy}><Icon name="lock" size={13} /> Make private</button>
		<button class="btn-danger btn-sm" onclick={() => bulk('delete')} disabled={busy}><Icon name="trash" size={13} /> Delete</button>
		<button class="btn-ghost btn-sm ml-auto" onclick={() => (selected = [])}>Clear</button>
	</div>
{/if}

{#if data.files.length}
	<div class="mt-5 flex items-center gap-2 px-1">
		<label class="flex cursor-pointer items-center gap-2 text-[11px] text-[rgb(var(--fg-subtle))]">
			<input type="checkbox" checked={selected.length === data.files.length} onchange={toggleAll} class="h-3.5 w-3.5 rounded border-[rgb(var(--border-strong))] bg-transparent accent-[rgb(var(--accent))]" />
			Select all on this page
		</label>
	</div>

	{#if view === 'grid'}
		<div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
			{#each data.files as file (file.id)}
				<div class="group card-flat relative overflow-hidden transition hover:border-[rgb(var(--border-strong))]">
					<label class="absolute left-2 top-2 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-md bg-black/45 backdrop-blur">
						<input
							type="checkbox"
							class="h-3.5 w-3.5 rounded border-white/40 bg-transparent accent-[rgb(var(--accent))]"
							checked={selected.includes(file.id)}
							onchange={() => toggle(file.id)}
						/>
					</label>
					<div class="absolute right-2 top-2 z-10 flex gap-1">
						{#if fileVisibility(file) === 'private'}
							<span class="badge bg-black/50 text-white backdrop-blur"><Icon name="lock" size={10} /></span>
						{:else if fileVisibility(file) === 'unlisted'}
							<span class="badge bg-black/50 text-white backdrop-blur"><Icon name="link" size={10} /></span>
						{/if}
					</div>

					<a href="/dashboard/images/{file.id}" class="block aspect-square overflow-hidden bg-[rgb(var(--surface-3))]">
						{#if file.mime.startsWith('image/') && (file.thumb_path || file.mime === 'image/svg+xml')}
							<img src={file.thumb_path ? `/t/${file.id}` : `/i/${file.id}`} alt={file.original_name} loading="lazy" class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
						{:else}
							<span class="flex h-full w-full flex-col items-center justify-center gap-1.5 text-[rgb(var(--fg-subtle))]">
								<Icon name={file.mime.startsWith('video/') ? 'film' : 'folder'} size={28} />
								<span class="text-[10px] font-semibold uppercase">{file.ext}</span>
							</span>
						{/if}
					</a>

					<div class="p-2.5">
						<a href="/dashboard/images/{file.id}" class="block truncate text-xs font-medium hover:text-accent">{truncate(file.original_name, 32)}</a>
						<div class="mt-1 flex items-center gap-2 text-[10px] text-[rgb(var(--fg-subtle))]">
							<span>{formatBytes(file.size)}</span>
							<span>·</span>
							<span class="inline-flex items-center gap-0.5"><Icon name="eye" size={10} /> {formatNumber(file.views)}</span>
							<span class="ml-auto">{timeAgo(file.created_at)}</span>
						</div>
					</div>

					<div class="flex items-center gap-0.5 border-t border-[rgb(var(--border))] px-1.5 py-1">
						<button class="btn-icon h-7 w-7" onclick={() => copyLink(file.id)} title="Copy link"><Icon name="copy" size={13} /></button>
						<a href="/i/{file.id}" target="_blank" rel="noreferrer" class="btn-icon h-7 w-7" title="Open"><Icon name="external" size={13} /></a>
						<button
							class="btn-icon h-7 w-7"
							onclick={() => toggleVisibility(file.id, file.is_public === 0)}
							title={file.is_public ? 'Make private' : 'Make public'}
						>
							<Icon name={file.is_public ? 'eye' : 'lock'} size={13} />
						</button>
						<button class="btn-icon ml-auto h-7 w-7 hover:text-red-400" onclick={() => removeOne(file.id)} title="Delete"><Icon name="trash" size={13} /></button>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="table-wrap mt-4">
			<table class="table">
				<thead>
					<tr>
						<th class="w-8"></th>
						<th>File</th>
						<th>Visibility</th>
						<th>Size</th>
						<th>Views</th>
						<th>Uploaded</th>
						<th class="text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each data.files as file (file.id)}
						<tr>
							<td>
								<input
									type="checkbox"
									class="h-3.5 w-3.5 rounded border-[rgb(var(--border-strong))] bg-transparent accent-[rgb(var(--accent))]"
									checked={selected.includes(file.id)}
									onchange={() => toggle(file.id)}
								/>
							</td>
							<td>
								<a href="/dashboard/images/{file.id}" class="flex items-center gap-3">
									<span class="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[rgb(var(--surface-3))]">
										{#if file.mime.startsWith('image/') && file.thumb_path}
											<img src="/t/{file.id}" alt="" class="h-full w-full object-cover" loading="lazy" />
										{:else}
											<span class="flex h-full w-full items-center justify-center text-[rgb(var(--fg-subtle))]"><Icon name="folder" size={15} /></span>
										{/if}
									</span>
									<span class="min-w-0">
										<span class="block max-w-[280px] truncate text-xs font-medium">{file.original_name}</span>
										<span class="block text-[10px] text-[rgb(var(--fg-subtle))]">{file.width && file.height ? `${file.width}×${file.height} · ` : ''}{file.mime}</span>
									</span>
								</a>
							</td>
							<td>
								{#if fileVisibility(file) === 'public'}
									<span class="badge badge-success">Public</span>
								{:else if fileVisibility(file) === 'unlisted'}
									<span class="badge badge-accent"><Icon name="link" size={10} /> Unlisted</span>
								{:else}
									<span class="badge"><Icon name="lock" size={10} /> Private</span>
								{/if}
							</td>
							<td class="text-xs text-[rgb(var(--fg-muted))]">{formatBytes(file.size)}</td>
							<td class="text-xs text-[rgb(var(--fg-muted))]">{formatNumber(file.views)}</td>
							<td class="text-xs text-[rgb(var(--fg-subtle))]" title={formatDate(file.created_at, true)}>{timeAgo(file.created_at)}</td>
							<td>
								<div class="flex items-center justify-end gap-0.5">
									<button class="btn-icon h-7 w-7" onclick={() => copyLink(file.id)} title="Copy link"><Icon name="copy" size={13} /></button>
									<a href="/i/{file.id}" target="_blank" rel="noreferrer" class="btn-icon h-7 w-7" title="Open"><Icon name="external" size={13} /></a>
									<a href="/dashboard/images/{file.id}" class="btn-icon h-7 w-7" title="Edit"><Icon name="edit" size={13} /></a>
									<button class="btn-icon h-7 w-7 hover:text-red-400" onclick={() => removeOne(file.id)} title="Delete"><Icon name="trash" size={13} /></button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<div class="mt-12">
		<Pagination page={data.page} pages={data.pages} {buildHref} />
	</div>
{:else}
	<div class="mt-4">
		<EmptyState
			icon="images"
			title={data.q || data.visibility !== 'all' ? 'No files match those filters' : 'Your library is empty'}
			description={data.q || data.visibility !== 'all' ? 'Try clearing the search or filters.' : 'Upload your first image or file to get a shareable link in seconds.'}
		>
			<a href="/dashboard/upload" class="btn-primary"><Icon name="upload" size={15} /> Upload a file</a>
			{#if data.q || data.visibility !== 'all'}<a href="/dashboard/images" class="btn-secondary">Clear filters</a>{/if}
		</EmptyState>
	</div>
{/if}
