<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import FileCard from '$lib/components/FileCard.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';

	let { data, form }: { data: PageData; form: (ActionData & Record<string, any>) | null } = $props();
</script>

<svelte:head><title>Bookmarks · {data.site.siteName}</title></svelte:head>

<div>
	<h1 class="page-title">Bookmarks</h1>
	<p class="mt-1 text-sm text-[rgb(var(--fg-muted))]">Public files you saved for later. {data.total} item{data.total === 1 ? '' : 's'}.</p>
</div>

{#if form?.success}
	<div class="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">{form.success}</div>
{/if}

{#if data.files.length}
	<div class="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
		{#each data.files as file (file.id)}
			<div class="group relative">
				<FileCard {file} />
				<form method="POST" action="?/remove" use:enhance class="absolute right-2 top-2 z-10">
					<input type="hidden" name="fileId" value={file.id} />
					<button class="btn-icon h-8 w-8 bg-black/50 text-white backdrop-blur hover:bg-red-500/80 hover:text-white" title="Remove bookmark" type="submit">
						<Icon name="x" size={14} />
					</button>
				</form>
			</div>
		{/each}
	</div>
{:else}
	<div class="mt-7">
		<EmptyState icon="bookmark" title="No bookmarks yet" description="Tap Save on any public file while exploring to keep it here.">
			<a href="/explore" class="btn-primary"><Icon name="globe" size={15} /> Explore files</a>
		</EmptyState>
	</div>
{/if}
