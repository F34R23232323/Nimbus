<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { timeAgo } from '$lib/utils/format';

	let { data, form }: { data: PageData; form: (ActionData & Record<string, any>) | null } = $props();

	const icons: Record<string, string> = { like: 'heart', comment: 'message', upload: 'upload', share: 'link' };
	const unread = $derived(data.notifications.filter((n) => n.read === 0).length);
</script>

<svelte:head><title>Notifications · {data.site.siteName}</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-5">
	<div>
		<h1 class="page-title">Notifications</h1>
		<p class="mt-1 text-sm text-[rgb(var(--fg-muted))]">{unread} unread · {data.notifications.length} total</p>
	</div>
	{#if unread > 0}
		<form method="POST" action="?/markAll" use:enhance>
			<button class="btn-secondary btn-sm" type="submit"><Icon name="check" size={14} /> Mark all read</button>
		</form>
	{/if}
</div>

{#if form?.success}
	<div class="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">{form.success}</div>
{/if}

{#if data.notifications.length}
	<div class="card-flat mt-6 overflow-hidden">
		<ul class="divide-y divide-[rgb(var(--border))]">
			{#each data.notifications as item (item.id)}
				<li class="flex items-start gap-3 px-5 py-4 {item.read === 0 ? 'bg-accent/[0.045]' : ''}">
					<span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl {item.read === 0 ? 'bg-accent/15 text-accent' : 'bg-[rgb(var(--surface-2))] text-[rgb(var(--fg-subtle))]'}">
						<Icon name={icons[item.type] ?? 'bell'} size={15} />
					</span>
					<div class="min-w-0 flex-1">
						{#if item.link}
							<a href={item.link} class="text-sm font-medium hover:text-accent">{item.message}</a>
						{:else}
							<p class="text-sm font-medium">{item.message}</p>
						{/if}
						<p class="mt-0.5 text-[11px] text-[rgb(var(--fg-subtle))]" title={new Date(item.created_at).toLocaleString()}>{timeAgo(item.created_at)}</p>
					</div>
					<div class="flex shrink-0 items-center gap-0.5">
						{#if item.read === 0}
							<form method="POST" action="?/markOne" use:enhance>
								<input type="hidden" name="id" value={item.id} />
								<button class="btn-icon h-8 w-8" title="Mark as read" type="submit"><Icon name="check" size={14} /></button>
							</form>
						{/if}
						<form method="POST" action="?/remove" use:enhance>
							<input type="hidden" name="id" value={item.id} />
							<button class="btn-icon h-8 w-8 hover:text-red-400" title="Delete" type="submit"><Icon name="x" size={14} /></button>
						</form>
					</div>
				</li>
			{/each}
		</ul>
	</div>
{:else}
	<div class="mt-5">
		<EmptyState icon="bell" title="All caught up" description="Likes, comments and share activity will show up here." />
	</div>
{/if}
