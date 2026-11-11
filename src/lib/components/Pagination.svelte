<script lang="ts">
	import Icon from './Icon.svelte';

	let {
		page,
		pages,
		buildHref
	}: { page: number; pages: number; buildHref: (page: number) => string } = $props();

	const window = $derived.by(() => {
		const out: (number | 'gap')[] = [];
		const push = (v: number | 'gap') => out.push(v);
		if (pages <= 7) {
			for (let i = 1; i <= pages; i++) push(i);
			return out;
		}
		push(1);
		if (page > 3) push('gap');
		for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) push(i);
		if (page < pages - 2) push('gap');
		push(pages);
		return out;
	});
</script>

{#if pages > 1}
	<nav class="flex items-center justify-center gap-2" aria-label="Pagination">
		<a
			href={buildHref(Math.max(1, page - 1))}
			class="btn-icon {page === 1 ? 'pointer-events-none opacity-40' : ''}"
			aria-label="Previous page"
		>
			<Icon name="chevronLeft" size={17} />
		</a>
		{#each window as item, i (i)}
			{#if item === 'gap'}
				<span class="px-1 text-sm text-[rgb(var(--fg-subtle))]">…</span>
			{:else}
				<a
					href={buildHref(item)}
					class="flex h-10 min-w-10 items-center justify-center rounded-xl px-2.5 text-sm font-semibold transition {item === page
						? 'bg-accent text-white'
						: 'text-[rgb(var(--fg-muted))] hover:bg-[rgb(var(--surface-2))]'}"
				>
					{item}
				</a>
			{/if}
		{/each}
		<a
			href={buildHref(Math.min(pages, page + 1))}
			class="btn-icon {page === pages ? 'pointer-events-none opacity-40' : ''}"
			aria-label="Next page"
		>
			<Icon name="chevronRight" size={17} />
		</a>
	</nav>
{/if}
