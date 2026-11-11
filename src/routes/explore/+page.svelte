<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { PageData } from './$types';
	import FileCard from '$lib/components/FileCard.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Select from '$lib/components/Select.svelte';
	import { formatNumber } from '$lib/utils/format';
	import type { SelectOption } from '$lib/types';

	let { data }: { data: PageData } = $props();

	let search = $state(data.q);
	let type = $state(data.type);
	let sort = $state(data.sort);

	function submitSearch(event: SubmitEvent) {
		event.preventDefault();
		const params = new URLSearchParams($page.url.searchParams);
		if (search.trim()) params.set('q', search.trim());
		else params.delete('q');
		params.delete('page');
		goto(`/explore?${params.toString()}`, { keepFocus: true });
	}

	function applyFilter(nextSort: string = sort) {
		const params = new URLSearchParams($page.url.searchParams);
		if (type === 'all') params.delete('type');
		else params.set('type', type);
		params.set('sort', nextSort);
		params.delete('page');
		goto(`/explore?${params.toString()}`);
	}

	const sortOptions: SelectOption[] = [
		{ value: 'new', label: 'Newest first', icon: 'clock' },
		{ value: 'old', label: 'Oldest first', icon: 'clock' },
		{ value: 'views', label: 'Most viewed', icon: 'eye' },
		{ value: 'name', label: 'Name A–Z', icon: 'list' }
	];

	function changeSort(value: string) {
		sort = value as typeof sort;
		applyFilter(value);
	}

	function buildHref(p: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', String(p));
		return `?${params.toString()}`;
	}
</script>

<svelte:head>
	<title>Explore · {data.site.siteName}</title>
	<meta name="description" content="Browse public images and files shared on this instance." />
</svelte:head>

<div class="mx-auto max-w-[1540px] px-5 py-12 sm:px-8 sm:py-16">
	<div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
		<div>
			<span class="badge badge-accent"><Icon name="globe" size={12} /> Public gallery</span>
			<h1 class="page-title mt-4">Explore</h1>
			<p class="mt-2 text-sm text-[rgb(var(--fg-muted))]">
				{formatNumber(data.total)} public {data.total === 1 ? 'item' : 'items'}{data.tag ? ` tagged #${data.tag}` : ''}{data.q ? ` matching “${data.q}”` : ''}.
			</p>
		</div>

		<form class="flex w-full max-w-xl flex-col gap-2 sm:flex-row" onsubmit={submitSearch}>
			<div class="relative flex-1">
				<span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--fg-subtle))]">
					<Icon name="search" size={16} />
				</span>
				<input
					class="input pl-9"
					placeholder="Search by filename, type or ID…"
					bind:value={search}
					autofocus={$page.url.searchParams.get('focus') === 'search'}
					aria-label="Search public files"
				/>
			</div>
			<button class="btn-primary" type="submit">Search</button>
		</form>
	</div>

	<div class="mt-10 flex flex-wrap items-center gap-3 border-b border-[rgb(var(--border))] pb-6">
		<div class="flex rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-0.5">
			{#each [{ value: 'all', label: 'All' }, { value: 'images', label: 'Images' }, { value: 'files', label: 'Files' }] as option (option.value)}
				<button
					class="rounded-[10px] px-3 py-1.5 text-xs font-semibold transition {type === option.value ? 'bg-[rgb(var(--surface))] text-[rgb(var(--fg))] shadow-sm' : 'text-[rgb(var(--fg-muted))] hover:text-[rgb(var(--fg))]'}"
					onclick={() => { type = option.value as typeof type; applyFilter(); }}
				>
					{option.label}
				</button>
			{/each}
		</div>

		{#if data.tag}
			<a href="/explore" class="chip chip-active">
				#{data.tag} <Icon name="x" size={11} />
			</a>
		{/if}

		<Select
			class="ml-auto w-52"
			bind:value={sort}
			options={sortOptions}
			onchange={changeSort}
		/>
	</div>

	{#if data.files.length}
		<div class="mt-9 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{#each data.files as file (file.id)}
				<FileCard {file} />
			{/each}
		</div>
		<div class="mt-14">
			<Pagination page={data.page} pages={data.pages} {buildHref} />
		</div>
	{:else}
		<div class="mt-8">
			<EmptyState
				icon="search"
				title="Nothing to show yet"
				description={data.q || data.tag
					? 'No public files matched those filters. Try a different search.'
					: 'No public files have been uploaded yet. Be the first!'}
			>
				{#if data.user}
					<a href="/dashboard/upload" class="btn-primary"><Icon name="upload" size={15} /> Upload a file</a>
				{:else}
					<a href="/login?next=/dashboard/upload" class="btn-primary"><Icon name="login" size={15} /> Sign in to upload</a>
				{/if}
			</EmptyState>
		</div>
	{/if}
</div>
