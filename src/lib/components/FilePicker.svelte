<script lang="ts">
	import Icon from './Icon.svelte';
	import { portal } from '$lib/actions/portal';
	import { formatBytes, truncate } from '$lib/utils/format';
	import type { FileWithMeta } from '$lib/types';

	let {
		value = $bindable(''),
		files = [],
		name = '',
		placeholder = 'Choose a file…',
		disabled = false,
		class: className = '',
		onchange = undefined
	}: {
		value?: string;
		files: FileWithMeta[];
		name?: string;
		placeholder?: string;
		disabled?: boolean;
		class?: string;
		onchange?: (value: string) => void;
	} = $props();

	let open = $state(false);
	let search = $state('');
	let searchInput: HTMLInputElement | undefined = $state();

	const selected = $derived(files.find((file) => file.id === value));
	const filtered = $derived(
		search.trim()
			? files.filter((file) =>
					file.original_name.toLowerCase().includes(search.toLowerCase())
				)
			: files
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
		<span class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[rgb(var(--surface-3))]">
			{#if selected && selected.mime.startsWith('image/') && selected.thumb_path}
				<img src="/t/{selected.id}" alt="" class="h-full w-full object-cover" />
			{:else}
				<Icon name="image" size={15} class="text-[rgb(var(--fg-subtle))]" />
			{/if}
		</span>
		<span class="min-w-0 flex-1 truncate {selected ? '' : 'text-[rgb(var(--fg-subtle))]'}">
			{selected ? truncate(selected.original_name, 38) : placeholder}
		</span>
		<Icon name="chevronDown" size={15} class="shrink-0 text-[rgb(var(--fg-subtle))]" />
	</button>
</div>

{#if open}
	<div use:portal>
		<div class="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm" onclick={() => (open = false)} aria-hidden="true"></div>
		<div
			class="fixed inset-0 z-[91] flex flex-col bg-[rgb(var(--surface))] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[84vh] sm:w-[min(92vw,900px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:border-[rgb(var(--border))] sm:shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-label="Choose a file"
		>
			<header class="flex items-center justify-between gap-4 border-b border-[rgb(var(--border))] px-5 py-4 sm:px-6 sm:py-5">
				<div>
					<h2 class="text-base font-bold">Choose a file</h2>
					<p class="mt-0.5 text-xs text-[rgb(var(--fg-muted))]">Pick something from your library.</p>
				</div>
				<button class="btn-icon" onclick={() => (open = false)} aria-label="Close"><Icon name="x" size={18} /></button>
			</header>

			<div class="border-b border-[rgb(var(--border))] p-3 sm:p-4">
				<div class="relative">
					<Icon name="search" size={16} class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgb(var(--fg-subtle))]" />
					<input bind:this={searchInput} bind:value={search} class="input min-h-[44px] pl-10" placeholder="Search your files…" />
				</div>
			</div>

			<div class="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
					{#each filtered as file (file.id)}
						<button
							type="button"
							class="group overflow-hidden rounded-2xl border text-left transition {value === file.id
								? 'border-accent bg-accent/5 ring-1 ring-accent/40'
								: 'border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] hover:border-[rgb(var(--border-strong))]'}"
							onclick={() => choose(file.id)}
						>
							<span class="relative flex aspect-square items-center justify-center overflow-hidden bg-[rgb(var(--surface-3))]">
								{#if file.mime.startsWith('image/') && file.thumb_path}
									<img src="/t/{file.id}" alt="" class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" loading="lazy" />
								{:else}
									<span class="flex flex-col items-center gap-1.5 text-[rgb(var(--fg-subtle))]">
										<Icon name={file.mime.startsWith('video/') ? 'film' : 'folder'} size={26} />
										<span class="text-[10px] font-semibold uppercase">{file.ext}</span>
									</span>
								{/if}
								{#if value === file.id}
									<span class="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-white"><Icon name="check" size={13} /></span>
								{/if}
							</span>
							<span class="block p-3">
								<span class="block truncate text-xs font-semibold">{truncate(file.original_name, 28)}</span>
								<span class="mt-0.5 block text-[10px] text-[rgb(var(--fg-subtle))]">{formatBytes(file.size)}</span>
							</span>
						</button>
					{/each}
				</div>
				{#if !filtered.length}
					<p class="px-3 py-16 text-center text-sm text-[rgb(var(--fg-subtle))]">No files found.</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
