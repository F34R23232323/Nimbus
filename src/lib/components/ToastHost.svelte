<script lang="ts">
	import { toasts, dismissToast } from '$lib/stores/ui';
	import Icon from './Icon.svelte';

	const icons = { success: 'check', error: 'alert', info: 'info', warning: 'alert' } as const;
	const tones = {
		success: 'text-emerald-400 bg-emerald-500/10',
		error: 'text-red-400 bg-red-500/10',
		info: 'text-accent bg-accent/10',
		warning: 'text-amber-400 bg-amber-500/10'
	} as const;
</script>

<div class="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(92vw,410px)] flex-col gap-3">
	{#each $toasts as t (t.id)}
		<div
			class="pointer-events-auto flex items-start gap-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-2xl animate-fade-up"
			role="status"
		>
			<span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full {tones[t.kind]}">
				<Icon name={icons[t.kind]} size={15} strokeWidth={2.2} />
			</span>
			<div class="min-w-0 flex-1">
				<p class="text-sm font-medium leading-snug">{t.message}</p>
				{#if t.detail}<p class="mt-0.5 text-xs text-[rgb(var(--fg-subtle))]">{t.detail}</p>{/if}
			</div>
			<button class="btn-icon h-7 w-7" onclick={() => dismissToast(t.id)} aria-label="Dismiss">
				<Icon name="x" size={14} />
			</button>
		</div>
	{/each}
</div>
