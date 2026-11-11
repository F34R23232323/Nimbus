<script lang="ts">
	import { copyText } from '$lib/utils/format';
	import { toast } from '$lib/stores/ui';
	import Icon from './Icon.svelte';

	let {
		text,
		label = '',
		copiedLabel = 'Copied',
		class: className = '',
		iconOnly = false
	}: {
		text: string;
		label?: string;
		copiedLabel?: string;
		class?: string;
		iconOnly?: boolean;
	} = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function handle() {
		const ok = await copyText(text);
		if (!ok) {
			toast('Could not access the clipboard', 'error');
			return;
		}
		copied = true;
		clearTimeout(timer);
		timer = setTimeout(() => (copied = false), 1600);
	}
</script>

<button
	type="button"
	class={className || (iconOnly ? 'btn-icon' : 'btn-secondary btn-sm')}
	onclick={handle}
	title={copied ? copiedLabel : 'Copy'}
	aria-label={copied ? copiedLabel : `Copy ${label || 'to clipboard'}`}
>
	<Icon name={copied ? 'check' : 'copy'} size={iconOnly ? 16 : 14} />
	{#if !iconOnly && label}<span>{copied ? copiedLabel : label}</span>{/if}
</button>
