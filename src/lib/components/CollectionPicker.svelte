<script lang="ts">
	import Icon from './Icon.svelte';
	import { portal } from '$lib/actions/portal';
	import { fileVisibility } from '$lib/visibility';
	import type { Collection } from '$lib/types';

	let {
		value = $bindable(''),
		collections = [],
		name = '',
		placeholder = 'Choose a collection…',
		allowNone = true,
		disabled = false,
		class: className = '',
		onchange = undefined
	}: {
		value?: string;
		collections: Collection[];
		name?: string;
		placeholder?: string;
		allowNone?: boolean;
		disabled?: boolean;
		class?: string;
		onchange?: (value: string) => void;
	} = $props();

	let open = $state(false);
	let search = $state('');
	let searchInput: HTMLInputElement | undefined = $state();

	const selected = $derived(collections.find((collection) => collection.id === value));
	const filtered = $derived(
		search.trim()
			? collections.filter((collection) =>
					collection.name.toLowerCase().includes(search.toLowerCase())
				)
			: collections
	);

	function openPicker() {
		if (disabled) return;
		open = true;
		search = '';
		setTimeout(() => searchInput?.focus(), 40);
	}

	function choose(id: string) {
		value = id;
		open = false;
		onchange?.(id);
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) {
			event.preventDefault();
			open = false;
		}
	}
</script>

<svelte:window onkeydown={onkeydown} />

{#if name}<input type="hidden" {name} {value} />{/if}

<div class={className}>
	<button
		type="button"
		class="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-2))] px-3.5 py-2.5 text-left text-sm outline-none transition hover:border-[rgb(var(--border-strong))] focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
		onclick={openPicker}
		{disabled}
	>
		<span class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[rgb(var(--surface-3))] text-accent">
			{#if selected?.cover_file_id}
				<img src="/t/{selected.cover_file_id}" alt="" class="h-full w-full object-cover" />
			{:else}
				<Icon name="folder" size={15} />
			{/if}
		</span>
		<span class="min-w-0 flex-1 truncate {selected ? '' : 'text-[rgb(var(--fg-subtle))]'}">
			{selected?.path ?? selected?.name ?? placeholder}
		</span>
		<Icon name="chevronDown" size={15} class="shrink-0 text-[rgb(var(--fg-subtle))]" />
	</button>
</div>

{#if open}
	<div use:portal>
		<div class="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" onclick={() => (open = false)} aria-hidden="true"></div>
		<div
			class="fixed inset-0 z-[91] flex flex-col bg-[rgb(var(--surface))] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[82vh] sm:w-[min(92vw,780px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:border-[rgb(var(--border))] sm:shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-label="Choose a collection"
		>
			<header class="flex items-center justify-between gap-4 border-b border-[rgb(var(--border))] px-5 py-4 sm:px-6 sm:py-5">
				<div>
					<h2 class="text-base font-bold">Choose a collection</h2>
					<p class="mt-0.5 text-xs text-[rgb(var(--fg-muted))]">Select the folder for this upload.</p>
				</div>
				<button class="btn-icon" onclick={() => (open = false)} aria-label="Close"><Icon name="x" size={18} /></button>
			</header>

			<div class="border-b border-[rgb(var(--border))] p-3 sm:p-4">
				<div class="relative">
					<Icon name="search" size={16} class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgb(var(--fg-subtle))]" />
					<input bind:this={searchInput} bind:value={search} class="input min-h-[44px] pl-10" placeholder="Search collections…" />
				</div>
			</div>

			<div class="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
					{#if allowNone}
						<button
							type="button"
							class="group flex flex-col overflow-hidden rounded-2xl border text-left transition {value === ''
								? 'border-accent bg-accent/5 ring-1 ring-accent/40'
								: 'border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] hover:border-[rgb(var(--border-strong))]'}"
							onclick={() => choose('')}
						>
							<span class="flex aspect-[4/3] items-center justify-center bg-[rgb(var(--surface-3))] text-[rgb(var(--fg-subtle))]">
								<Icon name="x" size={24} />
							</span>
							<span class="flex items-center justify-between gap-2 p-3">
								<span class="text-sm font-semibold">No collection</span>
								{#if value === ''}<Icon name="check" size={15} class="text-accent" />{/if}
							</span>
						</button>
					{/if}

					{#each filtered as collection (collection.id)}
						{@const visibility = fileVisibility(collection)}
						<button
							type="button"
							class="group flex flex-col overflow-hidden rounded-2xl border text-left transition {value === collection.id
								? 'border-accent bg-accent/5 ring-1 ring-accent/40'
								: 'border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] hover:border-[rgb(var(--border-strong))]'}"
							onclick={() => choose(collection.id)}
						>
							<span class="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-accent/15 to-fuchsia-500/10">
								<Icon name="folder" size={26} class="text-accent/60" />
								{#if collection.cover_file_id}
									<img src="/t/{collection.cover_file_id}" alt="" class="absolute inset-0 h-full w-full object-cover" loading="lazy" />
								{/if}
								<span class="absolute left-2 top-2 flex gap-1">
									{#if visibility === 'public'}
										<span class="badge bg-black/45 text-white backdrop-blur"><Icon name="globe" size={9} /></span>
									{:else if visibility === 'unlisted'}
										<span class="badge bg-black/45 text-white backdrop-blur"><Icon name="eyeclosed" size={9} /></span>
									{:else}
										<span class="badge bg-black/45 text-white backdrop-blur"><Icon name="lock" size={9} /></span>
									{/if}
								</span>
								{#if value === collection.id}
									<span class="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white"><Icon name="check" size={13} /></span>
								{/if}
							</span>
							<span class="flex items-start justify-between gap-2 p-3">
								<span class="min-w-0">
									<span class="block truncate text-sm font-semibold">{collection.path ?? collection.name}</span>
									<span class="mt-0.5 block text-[11px] text-[rgb(var(--fg-subtle))]">{collection.file_count ?? 0} files</span>
								</span>
							</span>
						</button>
					{/each}
				</div>

				{#if !filtered.length && !allowNone}
					<p class="px-3 py-16 text-center text-sm text-[rgb(var(--fg-subtle))]">No collections found.</p>
				{/if}
			</div>

			<footer class="border-t border-[rgb(var(--border))] p-3 sm:p-4">
				<a href="/dashboard/collections" class="btn-secondary btn-sm w-full sm:w-auto">
					<Icon name="plus" size={14} /> Create or manage collections
				</a>
			</footer>
		</div>
	</div>
{/if}
