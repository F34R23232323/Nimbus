<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import Icon from './Icon.svelte';

	let {
		open = $bindable(false),
		title,
		description = '',
		onclose = undefined,
		children
	}: {
		open?: boolean;
		title: string;
		description?: string;
		onclose?: () => void;
		children?: import('svelte').Snippet;
	} = $props();

	function close() {
		open = false;
		onclose?.();
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') close();
	}
</script>

<svelte:window onkeydown={onkeydown} />

{#if open}
	<div class="fixed inset-0 z-[100]">
		<button class="fixed inset-0 cursor-default bg-black/60 backdrop-blur-sm" aria-label="Close panel" onclick={close} transition:fade={{ duration: 150 }}></button>
		<aside
			class="fixed inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-label={title}
			transition:fly={{ x: 36, duration: 220 }}
		>
			<header class="flex items-start justify-between gap-4 border-b border-[rgb(var(--border))] px-5 py-5 sm:px-6">
				<div>
					<h2 class="text-lg font-bold tracking-tight">{title}</h2>
					{#if description}<p class="mt-1 text-xs leading-relaxed text-[rgb(var(--fg-muted))]">{description}</p>{/if}
				</div>
				<button class="btn-icon shrink-0" onclick={close} aria-label="Close">
					<Icon name="x" size={18} />
				</button>
			</header>
			<div class="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
				{@render children?.()}
			</div>
		</aside>
	</div>
{/if}
