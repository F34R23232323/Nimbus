<script lang="ts">
	import { confirmState } from '$lib/stores/confirm';
	import Icon from './Icon.svelte';

	function finish(result: boolean) {
		const state = $confirmState;
		if (!state) return;
		state.resolve(result);
		confirmState.set(null);
	}

	function onkeydown(event: KeyboardEvent) {
		if (!$confirmState) return;
		if (event.key === 'Escape') finish(false);
		if (event.key === 'Enter') finish(true);
	}
</script>

<svelte:window onkeydown={onkeydown} />

{#if $confirmState}
	<div class="fixed inset-0 z-[110] flex items-end justify-center p-3 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={$confirmState.title}>
		<button class="fixed inset-0 cursor-default bg-black/65 backdrop-blur-sm" aria-label="Cancel" onclick={() => finish(false)}></button>
		<div class="relative w-full max-w-md overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-2xl animate-fade-up">
			<div class="p-6">
				<span class="flex h-12 w-12 items-center justify-center rounded-2xl {$confirmState.danger ? 'bg-red-500/10 text-red-400' : 'bg-accent/10 text-accent'}">
					<Icon name={$confirmState.danger ? 'trash' : 'alert'} size={22} />
				</span>
				<h2 class="mt-4 text-lg font-bold tracking-tight">{$confirmState.title}</h2>
				{#if $confirmState.message}
					<p class="mt-2 text-sm leading-relaxed text-[rgb(var(--fg-muted))]">{$confirmState.message}</p>
				{/if}
			</div>
			<div class="flex flex-col-reverse gap-2 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-4 sm:flex-row sm:justify-end">
				<button class="btn-secondary w-full sm:w-auto" onclick={() => finish(false)}>
					{$confirmState.cancelLabel ?? 'Cancel'}
				</button>
				<button class="{$confirmState.danger ? 'btn-danger' : 'btn-primary'} w-full sm:w-auto" onclick={() => finish(true)}>
					{$confirmState.confirmLabel ?? 'Confirm'}
				</button>
			</div>
		</div>
	</div>
{/if}
