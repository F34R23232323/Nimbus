<script lang="ts">
	import Icon from './Icon.svelte';
	import { portal } from '$lib/actions/portal';
	import type { SelectOption } from '$lib/types';

	let {
		value = $bindable(''),
		options = [],
		name = '',
		id = undefined,
		placeholder = 'Select…',
		disabled = false,
		searchable = false,
		class: className = '',
		buttonClass = '',
		align = 'left',
		onchange = undefined
	}: {
		value?: string;
		options: SelectOption[];
		name?: string;
		id?: string;
		placeholder?: string;
		disabled?: boolean;
		searchable?: boolean;
		class?: string;
		buttonClass?: string;
		align?: 'left' | 'right';
		onchange?: (value: string) => void;
	} = $props();

	let open = $state(false);
	let search = $state('');
	let mobile = $state(false);
	let trigger: HTMLButtonElement | undefined = $state();
	let searchInput: HTMLInputElement | undefined = $state();
	let popupTop = $state(0);
	let popupLeft = $state(0);
	let popupWidth = $state(260);
	let popupAbove = $state(false);

	const selected = $derived(options.find((option) => option.value === value));
	const filtered = $derived(
		searchable && search.trim()
			? options.filter((option) =>
					`${option.label} ${option.description ?? ''}`.toLowerCase().includes(search.toLowerCase())
				)
			: options
	);

	function position() {
		if (!trigger) return;
		const rect = trigger.getBoundingClientRect();
		const width = Math.min(Math.max(rect.width, 250), window.innerWidth - 24);
		mobile = window.innerWidth < 640;
		if (mobile) return;
		popupWidth = width;
		popupLeft =
			align === 'right'
				? Math.max(12, rect.right - width)
				: Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
		const below = window.innerHeight - rect.bottom - 16;
		popupAbove = below < 220 && rect.top > below;
		popupTop = popupAbove ? Math.max(12, rect.top - 312) : rect.bottom + 8;
	}

	function openMenu() {
		if (disabled) return;
		position();
		open = true;
		search = '';
		if (searchable) setTimeout(() => searchInput?.focus(), 30);
	}

	function close() {
		open = false;
		trigger?.focus();
	}

	function choose(option: SelectOption) {
		if (option.disabled) return;
		value = option.value;
		open = false;
		onchange?.(option.value);
		trigger?.focus();
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) {
			event.preventDefault();
			close();
		}
	}
</script>

<svelte:window
	onkeydown={onkeydown}
	onresize={() => {
		if (open) position();
	}}
/>

{#if name}<input type="hidden" {name} {value} />{/if}

<div class={className}>
	<button
		bind:this={trigger}
		{id}
		type="button"
		class="flex min-h-[44px] w-full items-center gap-2.5 rounded-xl border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-2))] px-3.5 py-2.5 text-left text-sm outline-none transition hover:border-[rgb(var(--border-strong))] focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-50 {buttonClass}"
		onclick={() => (open ? close() : openMenu())}
		{disabled}
		aria-haspopup="listbox"
		aria-expanded={open}
	>
		{#if selected?.image}
			<img src={selected.image} alt="" class="h-6 w-6 shrink-0 rounded-md object-cover" />
		{:else if selected?.icon}
			<Icon name={selected.icon} size={16} class="shrink-0 text-[rgb(var(--fg-subtle))]" />
		{/if}
		<span class="min-w-0 flex-1 truncate {selected ? '' : 'text-[rgb(var(--fg-subtle))]'}">
			{selected?.label ?? placeholder}
		</span>
		<Icon
			name="chevronDown"
			size={15}
			class="shrink-0 text-[rgb(var(--fg-subtle))] transition-transform {open ? 'rotate-180' : ''}"
		/>
	</button>
</div>

{#if open}
	<div use:portal>
		<div
			class="fixed inset-0 z-[101] {mobile ? 'bg-black/60 backdrop-blur-sm' : ''}"
			onclick={close}
			aria-hidden="true"
		></div>
		<div
			class="fixed z-[102] overflow-hidden border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-2xl {mobile
				? 'inset-x-3 bottom-3 max-h-[70vh] rounded-3xl'
				: 'rounded-2xl'}"
			style={mobile
				? ''
				: `top:${popupTop}px;left:${popupLeft}px;width:${popupWidth}px;max-height:${popupAbove ? 304 : 320}px;`}
			role="listbox"
			aria-label={placeholder}
		>
			{#if mobile}
				<div class="flex justify-center pb-1 pt-3">
					<span class="h-1.5 w-12 rounded-full bg-[rgb(var(--border-strong))]"></span>
				</div>
			{/if}
			{#if searchable}
				<div class="border-b border-[rgb(var(--border))] p-2.5">
					<div class="relative">
						<Icon name="search" size={15} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--fg-subtle))]" />
						<input
							bind:this={searchInput}
							bind:value={search}
							class="input min-h-[40px] py-2 pl-9 text-sm"
							placeholder="Search…"
							onclick={(event) => event.stopPropagation()}
						/>
					</div>
				</div>
			{/if}
			<div class="max-h-[inherit] overflow-y-auto p-1.5">
				{#each filtered as option (option.value)}
					<button
						type="button"
						class="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[rgb(var(--surface-2))] {option.value ===
						value
							? 'bg-accent/10 text-accent'
							: 'text-[rgb(var(--fg))]'} {option.disabled ? 'pointer-events-none opacity-40' : ''}"
						onclick={() => choose(option)}
						role="option"
						aria-selected={option.value === value}
					>
						{#if option.image}
							<img src={option.image} alt="" class="h-8 w-8 shrink-0 rounded-lg object-cover" />
						{:else if option.icon}
							<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--surface-2))]">
								<Icon name={option.icon} size={15} />
							</span>
						{/if}
						<span class="min-w-0 flex-1">
							<span class="block truncate font-medium">{option.label}</span>
							{#if option.description}
								<span class="mt-0.5 block truncate text-[11px] text-[rgb(var(--fg-subtle))]">{option.description}</span>
							{/if}
						</span>
						{#if option.value === value}
							<Icon name="check" size={15} class="shrink-0" />
						{/if}
					</button>
				{:else}
					<p class="px-3 py-8 text-center text-sm text-[rgb(var(--fg-subtle))]">No options</p>
				{/each}
			</div>
		</div>
	</div>
{/if}
