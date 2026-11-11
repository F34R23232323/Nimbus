<script lang="ts">
	import { initials } from '$lib/utils/format';

	let {
		name = '?',
		src = null,
		size = 36,
		class: className = ''
	}: { name?: string; src?: string | null; size?: number; class?: string } = $props();
</script>

{#if src}
	<img
		{src}
		alt={name}
		width={size}
		height={size}
		class="shrink-0 rounded-full object-cover ring-1 ring-[rgb(var(--border))] {className}"
		style="width:{size}px;height:{size}px"
		loading="lazy"
	/>
{:else}
	<span
		class="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-fuchsia-500 font-bold text-white {className}"
		style="width:{size}px;height:{size}px;font-size:{Math.max(10, Math.round(size * 0.36))}px"
		aria-hidden="true"
	>
		{initials(name)}
	</span>
{/if}
