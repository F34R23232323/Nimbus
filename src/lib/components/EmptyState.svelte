<script lang="ts">
	import Icon from './Icon.svelte';

	let {
		icon = 'sparkles',
		title,
		description = '',
		children
	}: { icon?: string; title: string; description?: string; children?: import('svelte').Snippet } = $props();
</script>

<div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[rgb(var(--border-strong))] px-8 py-20 text-center">
	<span class="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
		<Icon name={icon} size={24} />
	</span>
	<h3 class="text-base font-semibold">{title}</h3>
	{#if description}<p class="mt-2 max-w-md text-sm leading-relaxed text-[rgb(var(--fg-muted))]">{description}</p>{/if}
	{#if children}<div class="mt-7 flex flex-wrap items-center justify-center gap-2">{@render children?.()}</div>{/if}
</div>
