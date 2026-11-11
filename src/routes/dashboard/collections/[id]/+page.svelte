<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import FilePicker from '$lib/components/FilePicker.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Select from '$lib/components/Select.svelte';
	import SlideOver from '$lib/components/SlideOver.svelte';
	import { confirmSubmit } from '$lib/actions/confirmSubmit';
	import { formatBytes, formatDate, truncate } from '$lib/utils/format';
	import { fileVisibility } from '$lib/visibility';
	import type { SelectOption } from '$lib/types';

	let { data, form }: { data: PageData; form: (ActionData & Record<string, any>) | null } = $props();

	const collection = $derived(data.collection);
	const visibility = $derived(fileVisibility(collection));
	const visibilityOptions: SelectOption[] = [
		{ value: 'public', label: 'Public', description: 'Listed publicly and anyone with the link can view.', icon: 'globe' },
		{ value: 'unlisted', label: 'Unlisted', description: 'Hidden from listings, but anyone with the link can view.', icon: 'eyeclosed' },
		{ value: 'private', label: 'Private', description: 'Only you and administrators can view it.', icon: 'lock' }
	];
	const shareUrl = $derived(`${data.base}/c/${collection.slug}`);
	const imageFiles = $derived(
		[...data.files]
			.filter((file) => file.mime.startsWith('image/'))
			.sort((a, b) =>
				a.id === collection.cover_file_id ? -1 : b.id === collection.cover_file_id ? 1 : 0
			)
	);
	const previews = $derived(imageFiles.slice(0, 3));
	let settingsOpen = $state(false);
	let showCreateChild = $state(false);
	let settingsVisibility = $state('public');
	let childVisibility = $state('public');
	let selectedFile = $state('');

	function openSettings() {
		settingsVisibility = visibility;
		settingsOpen = true;
	}

	function openCreateChild() {
		childVisibility = 'public';
		showCreateChild = true;
	}
</script>

<svelte:head><title>{collection.name} · {data.site.siteName}</title></svelte:head>

<div class="space-y-6 sm:space-y-8">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div class="flex min-w-0 flex-wrap items-center gap-2 text-xs text-[rgb(var(--fg-subtle))]">
			<a href="/dashboard/collections" class="transition hover:text-[rgb(var(--fg))]">Collections</a>
			{#each data.ancestors as ancestor (ancestor.id)}
				<Icon name="chevronRight" size={11} />
				<a href="/dashboard/collections/{ancestor.id}" class="truncate transition hover:text-[rgb(var(--fg))]">{ancestor.name}</a>
			{/each}
			<Icon name="chevronRight" size={11} />
			<span class="truncate text-[rgb(var(--fg-muted))]">{collection.name}</span>
		</div>
		<div class="flex flex-wrap gap-2.5">
			<button class="btn-secondary btn-sm" onclick={openCreateChild}>
				<Icon name="folder" size={14} /> New subfolder
			</button>
			<button class="btn-secondary btn-sm" onclick={openSettings}>
				<Icon name="settings" size={14} /> Settings
			</button>
			<a href="/c/{collection.slug}" target="_blank" rel="noreferrer" class="btn-primary btn-sm">
				<Icon name="external" size={14} /> View collection
			</a>
		</div>
	</div>

	{#if form?.success}
		<div class="flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
			<Icon name="check" size={16} /> {form.success}
		</div>
	{/if}
	{#if form?.error}
		<div class="flex items-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">
			<Icon name="alert" size={16} /> {form.error}
		</div>
	{/if}

	<section class="grid overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] lg:grid-cols-[1.15fr_0.85fr]">
		<div class="relative min-h-[240px] bg-[rgb(var(--surface-2))] p-2.5 sm:min-h-[320px]">
			{#if previews.length}
				<div class="grid h-[220px] grid-cols-2 grid-rows-2 gap-2 sm:h-[300px]">
					{#each previews as file, index (file.id)}
						<a
							href="/dashboard/images/{file.id}"
							class="group relative overflow-hidden rounded-2xl bg-[rgb(var(--surface-3))] {index === 0 && previews.length === 3
								? 'row-span-2'
								: ''} {previews.length === 1 ? 'col-span-2 row-span-2' : ''} {previews.length === 2 ? 'row-span-2' : ''}"
						>
							<img
								src="/t/{file.id}"
								alt=""
								class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
								loading={index === 0 ? 'eager' : 'lazy'}
							/>
							<span class="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition group-hover:opacity-100"></span>
						</a>
					{/each}
				</div>
			{:else}
				<div class="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-accent/15 via-[rgb(var(--surface-2))] to-fuchsia-500/10">
					<span class="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent"><Icon name="folder" size={28} /></span>
					<p class="text-sm text-[rgb(var(--fg-subtle))]">No previews yet</p>
				</div>
			{/if}
		</div>

		<div class="flex flex-col justify-between gap-6 p-6 sm:p-8">
			<div>
				<div class="flex flex-wrap items-center gap-2">
					{#if visibility === 'public'}
						<span class="badge badge-success"><Icon name="globe" size={11} /> Public</span>
					{:else if visibility === 'unlisted'}
						<span class="badge"><Icon name="eyeclosed" size={11} /> Unlisted</span>
					{:else}
						<span class="badge"><Icon name="lock" size={11} /> Private</span>
					{/if}
					<span class="badge">{data.files.length} file{data.files.length === 1 ? '' : 's'}</span>
				</div>
				<h1 class="mt-4 page-title">{collection.name}</h1>
				<p class="mt-2 text-sm text-[rgb(var(--fg-muted))]">Created {formatDate(collection.created_at)}</p>
				{#if collection.description}
					<p class="mt-4 text-sm leading-relaxed text-[rgb(var(--fg-muted))]">{collection.description}</p>
				{:else}
					<p class="mt-4 text-sm italic text-[rgb(var(--fg-subtle))]">No description yet.</p>
				{/if}
			</div>

			<div>
				<p class="label">Collection link</p>
				<div class="flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] py-1.5 pl-3 pr-1.5">
					<Icon name="link" size={14} class="shrink-0 text-[rgb(var(--fg-subtle))]" />
					<code class="min-w-0 flex-1 truncate text-xs text-[rgb(var(--fg-muted))]">{shareUrl}</code>
					<CopyButton text={shareUrl} iconOnly class="btn-icon h-8 w-8" />
				</div>
			</div>
		</div>
	</section>

	<section>
		<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
			<div>
				<h2 class="section-title">Subfolders</h2>
				<p class="mt-1 text-sm text-[rgb(var(--fg-muted))]">Nest folders to keep large collections organised.</p>
			</div>
			<button class="btn-secondary btn-sm" onclick={openCreateChild}>
				<Icon name="plus" size={14} /> New subfolder
			</button>
		</div>

		{#if data.children.length}
			<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{#each data.children as child (child.id)}
					{@const cover = child.preview_ids?.split(',')[0]}
					{@const childVis = fileVisibility(child)}
					<a
						href="/dashboard/collections/{child.id}"
						class="card-flat group flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:border-[rgb(var(--border-strong))] hover:shadow-lg"
					>
						<span class="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-accent/15 to-fuchsia-500/10 text-accent">
							{#if cover}
								<img src="/t/{cover}" alt="" class="absolute inset-0 h-full w-full object-cover" loading="lazy" />
							{:else}
								<Icon name="folder" size={20} />
							{/if}
						</span>
						<span class="min-w-0 flex-1">
							<span class="flex items-center gap-1.5">
								<span class="truncate text-sm font-semibold">{child.name}</span>
								{#if childVis === 'private'}
									<Icon name="lock" size={11} class="shrink-0 text-[rgb(var(--fg-subtle))]" />
								{:else if childVis === 'unlisted'}
									<Icon name="eyeclosed" size={11} class="shrink-0 text-[rgb(var(--fg-subtle))]" />
								{/if}
							</span>
							<span class="mt-0.5 block text-[11px] text-[rgb(var(--fg-subtle))]">
								{child.file_count ?? 0} file{child.file_count === 1 ? '' : 's'}{#if child.child_count} · {child.child_count} folder{child.child_count === 1 ? '' : 's'}{/if}
							</span>
						</span>
						<Icon name="chevronRight" size={15} class="shrink-0 text-[rgb(var(--fg-subtle))] transition group-hover:text-accent" />
					</a>
				{/each}
			</div>
		{:else}
			<div class="card-flat flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
				<p class="text-sm text-[rgb(var(--fg-muted))]">No subfolders yet. Create one to split this collection into smaller sets.</p>
				<button class="btn-secondary btn-sm shrink-0" onclick={openCreateChild}>
					<Icon name="plus" size={14} /> New subfolder
				</button>
			</div>
		{/if}
	</section>

	<section class="card-flat p-4 sm:p-5">
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end">
			<div class="min-w-0 flex-1">
				<h2 class="section-title">Add a file</h2>
				<p class="mt-1 text-sm text-[rgb(var(--fg-muted))]">Choose from your library, then add it to this collection.</p>
			</div>
			{#if data.library.length}
				<form
					method="POST"
					action="?/add"
					use:enhance={() =>
						async ({ update }) => {
							await update();
							selectedFile = '';
						}}
					class="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-end"
				>
					<div class="w-full sm:w-[340px]">
						<FilePicker bind:value={selectedFile} name="fileId" files={data.library} placeholder="Select a file…" />
					</div>
					<button class="btn-primary" type="submit" disabled={!selectedFile}><Icon name="plus" size={14} /> Add file</button>
				</form>
			{:else}
				<p class="text-sm text-[rgb(var(--fg-subtle))]">All your files are already in this collection.</p>
			{/if}
		</div>
	</section>

	<section>
		<div class="mb-4 flex items-center justify-between gap-3">
			<h2 class="section-title">Files</h2>
			<span class="badge">{data.files.length} total</span>
		</div>

		{#if data.files.length}
			<div class="columns-1 gap-4 sm:columns-2 xl:columns-3">
				{#each data.files as file (file.id)}
					<article class="group mb-4 break-inside-avoid overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] transition hover:border-[rgb(var(--border-strong))] hover:shadow-xl">
						<a href="/dashboard/images/{file.id}" class="block bg-[rgb(var(--surface-3))]">
							{#if file.mime.startsWith('image/') && file.thumb_path}
								<img src="/t/{file.id}" alt={file.original_name} loading="lazy" class="h-auto w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
							{:else}
								<span class="flex aspect-video w-full flex-col items-center justify-center gap-2 text-[rgb(var(--fg-subtle))]">
									<Icon name={file.mime.startsWith('video/') ? 'film' : 'folder'} size={32} />
									<span class="text-[10px] font-semibold uppercase tracking-wider">{file.ext}</span>
								</span>
							{/if}
						</a>
						<div class="flex items-start gap-3 p-3.5">
							<div class="min-w-0 flex-1">
								<a href="/dashboard/images/{file.id}" class="block truncate text-sm font-semibold hover:text-accent">{truncate(file.original_name, 34)}</a>
								<p class="mt-1 text-[11px] text-[rgb(var(--fg-subtle))]">
									{formatBytes(file.size)}{#if file.width && file.height} · {file.width}×{file.height}{/if}
								</p>
							</div>
							<div class="flex shrink-0 gap-0.5">
								<CopyButton text="{data.base}/i/{file.id}" iconOnly class="btn-icon h-8 w-8" />
								<form method="POST" action="?/remove" use:confirmSubmit={{ title: 'Remove from collection?', message: 'The file stays in your library.', confirmLabel: 'Remove file' }}>
									<input type="hidden" name="fileId" value={file.id} />
									<button class="btn-icon h-8 w-8 hover:text-red-400" title="Remove from collection" type="submit"><Icon name="x" size={14} /></button>
								</form>
							</div>
						</div>
					</article>
				{/each}
			</div>
		{:else}
			<EmptyState icon="images" title="This collection is empty" description="Use the file picker above to add your first item." />
		{/if}
	</section>
</div>

<SlideOver bind:open={settingsOpen} title="Collection settings" description="Rename, describe or change who can view this collection.">
	<form
		method="POST"
		action="?/update"
		use:enhance={() =>
			async ({ update, result }) => {
				await update();
				if (result.type === 'success') settingsOpen = false;
			}}
		class="space-y-5"
	>
		<div>
			<label class="label" for="name">Name</label>
			<input id="name" name="name" class="input" value={collection.name} maxlength="80" required />
		</div>
		<div>
			<label class="label" for="description">Description</label>
			<textarea id="description" name="description" class="textarea min-h-[120px]" maxlength="300" placeholder="What's inside?">{collection.description}</textarea>
		</div>
		<div>
			<span class="label">Visibility</span>
			<Select name="visibility" bind:value={settingsVisibility} options={visibilityOptions} />
			<p class="mt-2 text-xs leading-relaxed text-[rgb(var(--fg-subtle))]">
				Each subfolder keeps its own visibility, independent of this folder.
			</p>
		</div>
		<button class="btn-primary w-full" type="submit"><Icon name="check" size={14} /> Save changes</button>
	</form>

	<div class="mt-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
		<h3 class="text-sm font-semibold text-red-400">Delete collection</h3>
		<p class="mt-1 text-xs leading-relaxed text-[rgb(var(--fg-muted))]">The files stay in your library; only this collection and its subfolders are deleted.</p>
		<form method="POST" action="?/delete" use:confirmSubmit={{ title: 'Delete this collection?', message: 'Its subfolders are deleted too. The files stay in your library. This cannot be undone.', confirmLabel: 'Delete collection' }} class="mt-4">
			<button class="btn-danger w-full" type="submit"><Icon name="trash" size={14} /> Delete collection</button>
		</form>
	</div>
</SlideOver>

<Modal bind:open={showCreateChild} title="New subfolder" description="Create a folder inside {collection.name}.">
	<form
		method="POST"
		action="?/createChild"
		use:enhance={() =>
			async ({ update, result }) => {
				await update();
				if (result.type === 'success') showCreateChild = false;
			}}
		class="space-y-5"
	>
		<div>
			<label class="label" for="child-name">Name</label>
			<input id="child-name" name="name" class="input" placeholder="Screenshots" maxlength="80" required />
		</div>
		<div>
			<label class="label" for="child-description">Description <span class="font-normal normal-case text-[rgb(var(--fg-subtle))]">(optional)</span></label>
			<textarea id="child-description" name="description" class="textarea min-h-[90px]" placeholder="What goes in this subfolder?" maxlength="300"></textarea>
		</div>
		<div>
			<span class="label">Visibility</span>
			<Select name="visibility" bind:value={childVisibility} options={visibilityOptions} />
			<p class="mt-2 text-xs leading-relaxed text-[rgb(var(--fg-subtle))]">
				This subfolder can be public even when its parent is private, and vice versa.
			</p>
		</div>
		<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
			<button type="button" class="btn-secondary" onclick={() => (showCreateChild = false)}>Cancel</button>
			<button type="submit" class="btn-primary"><Icon name="plus" size={14} /> Create subfolder</button>
		</div>
	</form>
</Modal>
