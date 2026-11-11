<script lang="ts">
	import Icon from './Icon.svelte';

	let {
		label,
		value,
		icon = 'chart',
		hint = '',
		tone = 'accent'
	}: { label: string; value: string | number; icon?: string; hint?: string; tone?: string } = $props();

	const tones: Record<string, string> = {
		accent: 'text-accent bg-accent/10',
		emerald: 'text-emerald-400 bg-emerald-500/10',
		amber: 'text-amber-400 bg-amber-500/10',
		rose: 'text-rose-400 bg-rose-500/10',
		sky: 'text-sky-400 bg-sky-500/10'
	};
</script>

<div class="card-flat flex items-start justify-between gap-5 p-6">
	<div class="min-w-0">
		<p class="stat-label">{label}</p>
		<p class="stat-value mt-2">{value}</p>
		{#if hint}<p class="mt-1 truncate text-xs text-[rgb(var(--fg-subtle))]">{hint}</p>{/if}
	</div>
	<span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl {tones[tone] ?? tones.accent}">
		<Icon name={icon} size={19} />
	</span>
</div>
