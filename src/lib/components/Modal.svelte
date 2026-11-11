<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import Icon from './Icon.svelte';

	let {
		open = $bindable(false),
		title = '',
		description = '',
		children,
		footer,
		size = 'md'
	}: {
		open?: boolean;
		title?: string;
		description?: string;
		children?: import('svelte').Snippet;
		footer?: import('svelte').Snippet;
		size?: 'sm' | 'md' | 'lg' | 'xl';
	} = $props();

	const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') open = false;
	}
</script>

<svelte:window onkeydown={onkeydown} />

{#if open}
	<div class="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto p-3 sm:items-center sm:p-4">
		<button
			class="fixed inset-0 cursor-default bg-black/60 backdrop-blur-sm"
			aria-label="Close dialog"
			onclick={() => (open = false)}
			transition:fade={{ duration: 150 }}
		></button>
		<div
			class="relative z-10 my-4 max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-2xl sm:my-8 {widths[size]}"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			transition:scale={{ duration: 160, start: 0.97 }}
		>
			<header class="flex items-start justify-between gap-4 border-b border-[rgb(var(--border))] px-6 py-5">
				<div>
					<h2 class="text-base font-semibold">{title}</h2>
					{#if description}<p class="mt-0.5 text-xs text-[rgb(var(--fg-muted))]">{description}</p>{/if}
				</div>
				<button class="btn-icon h-8 w-8" onclick={() => (open = false)} aria-label="Close">
					<Icon name="x" size={16} />
				</button>
			</header>
			<div class="px-6 py-5">
				{@render children?.()}
			</div>
			{#if footer}
				<footer class="flex items-center justify-end gap-2 border-t border-[rgb(var(--border))] px-6 py-4">
					{@render footer()}
				</footer>
			{/if}
		</div>
	</div>
{/if}
