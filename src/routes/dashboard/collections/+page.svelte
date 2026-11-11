<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import Icon from '$lib/components/Icon.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Select from '$lib/components/Select.svelte';
	import { timeAgo } from '$lib/utils/format';
	import { fileVisibility } from '$lib/visibility';
	import type { SelectOption } from '$lib/types';

	let { data, form }: { data: PageData; form: (ActionData & Record<string, any>) | null } = $props();

	let showCreate = $state(false);
	let query = $state('');
	let sort = $state('new');
	let newVisibility = $state('public');

	const visibilityOptions: SelectOption[] = [
		{ value: 'public', label: 'Public', description: 'Listed publicly and anyone with the link can view.', icon: 'globe' },
		{ value: 'unlisted', label: 'Unlisted', description: 'Hidden from listings, but anyone with the link can view.', icon: 'eyeclosed' },
		{ value: 'private', label: 'Private', description: 'Only you and administrators can view it.', icon: 'lock' }
	];

	const sortOptions: SelectOption[] = [
		{ value: 'new', label: 'Newest first', icon: 'clock' },
		{ value: 'old', label: 'Oldest first', icon: 'clock' },
		{ value: 'name', label: 'Name A–Z', icon: 'list' },
		{ value: 'files', label: 'Most files', icon: 'images' }
	];

	const collections = $derived(
		[...data.collections]
			.filter((collection) => collection.name.toLowerCase().includes(query.toLowerCase()))
			.sort((a, b) => {
				if (sort === 'old') return a.created_at - b.created_at;
				if (sort === 'name') return a.name.localeCompare(b.name);
				if (sort === 'files') return (b.file_count ?? 0) - (a.file_count ?? 0);
				return b.created_at - a.created_at;
			})
	);

	function previews(collection: (typeof data.collections)[number]): string[] {
		return collection.preview_ids ? collection.preview_ids.split(',').filter(Boolean) : [];
	}
</script>

<svelte:head><title>Collections · {data.site.siteName}</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-5">
	<div>
		<h1 class="page-title">Collections</h1>
		<p class="mt-2 max-w-2xl text-sm leading-relaxed text-[rgb(var(--fg-muted))]">
			Group uploads into folders, give them a cover and share the whole set with one link.
		</p>
	</div>
	<button class="btn-primary" onclick={() => (showCreate = true)}>
		<Icon name="plus" size={15} /> New collection
	</button>
</div>

{#if form?.error}
	<div class="mt-5 flex items-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-400">
		<Icon name="alert" size={16} /> {form.error}
	</div>
{/if}
{#if form?.success}
	<div class="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
		<Icon name="check" size={16} /> {form.success}
	</div>
{/if}

<div class="card-flat mt-6 flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center">
	<div class="relative flex-1">
		<Icon name="search" size={16} class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgb(var(--fg-subtle))]" />
		<input bind:value={query} class="input pl-10" placeholder="Search collections…" />
	</div>
	<Select class="w-full sm:w-48" bind:value={sort} options={sortOptions} />
	<span class="shrink-0 text-xs text-[rgb(var(--fg-subtle))]">{collections.length} folder{collections.length === 1 ? '' : 's'}</span>
</div>

{#if collections.length}
	<div class="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
		{#each collections as collection (collection.id)}
			{@const covers = previews(collection)}
			{@const visibility = fileVisibility(collection)}
			<article class="card-flat group overflow-hidden transition hover:-translate-y-0.5 hover:border-[rgb(var(--border-strong))] hover:shadow-xl">
				<a href="/dashboard/collections/{collection.id}" class="relative block aspect-[16/10] overflow-hidden bg-gradient-to-br from-accent/15 via-[rgb(var(--surface-2))] to-fuchsia-500/10">
					{#if covers.length}
						<div class="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5">
							{#each covers as id, index (id)}
								<div class="relative overflow-hidden {covers.length === 1
									? 'col-span-2 row-span-2'
									: covers.length === 2
										? 'row-span-2'
										: covers.length === 3 && index === 0
											? 'row-span-2'
											: ''}">
									<img
										src="/t/{id}"
										alt=""
										class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
										loading="lazy"
									/>
								</div>
							{/each}
						</div>
					{:else}
						<div class="flex h-full items-center justify-center">
							<Icon name="folder" size={38} class="text-accent/50" />
						</div>
					{/if}
					<div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0"></div>
					<div class="absolute left-3 top-3 flex flex-wrap gap-1.5">
						{#if visibility === 'public'}
							<span class="badge bg-black/45 text-white backdrop-blur"><Icon name="globe" size={10} /> Public</span>
						{:else if visibility === 'unlisted'}
							<span class="badge bg-black/45 text-white backdrop-blur"><Icon name="eyeclosed" size={10} /> Unlisted</span>
						{:else}
							<span class="badge bg-black/45 text-white backdrop-blur"><Icon name="lock" size={10} /> Private</span>
						{/if}
						<span class="badge bg-black/45 text-white backdrop-blur">{collection.file_count ?? 0} files</span>
						{#if collection.child_count}
							<span class="badge bg-black/45 text-white backdrop-blur">{collection.child_count} subfolder{collection.child_count === 1 ? '' : 's'}</span>
						{/if}
					</div>
				</a>

				<div class="p-5">
					<div class="flex items-start justify-between gap-3">
						<a href="/dashboard/collections/{collection.id}" class="min-w-0 flex-1">
							<h2 class="truncate text-base font-bold tracking-tight">{collection.name}</h2>
							<p class="mt-1 text-[11px] text-[rgb(var(--fg-subtle))]">Created {timeAgo(collection.created_at)}</p>
						</a>
						<div class="flex shrink-0 gap-0.5">
							<CopyButton text="{data.base}/c/{collection.slug}" iconOnly class="btn-icon h-9 w-9" />
							<a href="/c/{collection.slug}" target="_blank" rel="noreferrer" class="btn-icon h-9 w-9" aria-label="Open collection">
								<Icon name="external" size={15} />
							</a>
						</div>
					</div>
					{#if collection.description}
						<p class="mt-3 line-clamp-2 text-xs leading-relaxed text-[rgb(var(--fg-muted))]">{collection.description}</p>
					{:else}
						<p class="mt-3 text-xs italic text-[rgb(var(--fg-subtle))]">No description yet.</p>
					{/if}
				</div>
			</article>
		{/each}
	</div>
{:else}
	<div class="mt-6">
		<EmptyState
			icon="folder"
			title={query ? 'No matching collections' : 'No collections yet'}
			description={query ? 'Try a different search.' : 'Create an album, add screenshots or artwork, then share the whole set with one link.'}
		>
			{#if query}
				<button class="btn-secondary" onclick={() => (query = '')}>Clear search</button>
			{:else}
				<button class="btn-primary" onclick={() => (showCreate = true)}><Icon name="plus" size={15} /> Create a collection</button>
			{/if}
		</EmptyState>
	</div>
{/if}

<Modal bind:open={showCreate} title="New collection" description="Create a folder, then add files to it.">
	<form method="POST" action="?/create" class="space-y-5">
		<div>
			<label class="label" for="name">Name</label>
			<input id="name" name="name" class="input" placeholder="Screenshots" maxlength="80" required />
		</div>
		<div>
			<label class="label" for="description">Description <span class="font-normal normal-case text-[rgb(var(--fg-subtle))]">(optional)</span></label>
			<textarea id="description" name="description" class="textarea min-h-[90px]" placeholder="What goes in this collection?" maxlength="300"></textarea>
		</div>
		<div>
			<span class="label">Visibility</span>
			<Select name="visibility" bind:value={newVisibility} options={visibilityOptions} />
		</div>
		<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
			<button type="button" class="btn-secondary" onclick={() => (showCreate = false)}>Cancel</button>
			<button type="submit" class="btn-primary"><Icon name="plus" size={14} /> Create collection</button>
		</div>
	</form>
</Modal>
