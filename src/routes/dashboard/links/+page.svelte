<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { timeAgo, truncate } from '$lib/utils/format';

	let { data, form }: { data: PageData; form: (ActionData & Record<string, any>) | null } = $props();
</script>

<svelte:head><title>Short links · {data.site.siteName}</title></svelte:head>

<div>
	<h1 class="page-title">Short links</h1>
	<p class="mt-1 text-sm text-[rgb(var(--fg-muted))]">Turn long URLs into tidy <span class="font-mono text-xs">/short/…</span> links and track clicks.</p>
</div>

{#if form?.error}
	<div class="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{form.error}</div>
{/if}
{#if form?.success}
	<div class="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">{form.success}</div>
{/if}

<form method="POST" action="?/create" use:enhance class="card-flat mt-6 grid gap-4 p-5 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
	<div>
		<label class="label" for="target">Destination URL</label>
		<input id="target" name="target" class="input" placeholder="https://example.com/a/very/long/link" required />
	</div>
	<div>
		<label class="label" for="slug">Custom slug <span class="font-normal normal-case text-[rgb(var(--fg-subtle))]">(optional)</span></label>
		<input id="slug" name="slug" class="input" placeholder="my-link" maxlength="40" />
	</div>
	<button class="btn-primary" type="submit"><Icon name="plus" size={14} /> Shorten</button>
</form>

{#if data.links.length}
	<div class="table-wrap mt-6">
		<table class="table">
			<thead>
				<tr><th>Short link</th><th>Destination</th><th>Clicks</th><th>Created</th><th class="text-right">Actions</th></tr>
			</thead>
			<tbody>
				{#each data.links as link (link.id)}
					<tr>
						<td>
							<a href="/short/{link.slug}" target="_blank" rel="noreferrer" class="font-mono text-xs font-semibold text-accent hover:underline">/short/{link.slug}</a>
						</td>
						<td class="max-w-[280px]">
							<span class="block truncate text-xs text-[rgb(var(--fg-muted))]" title={link.target}>{truncate(link.target, 46)}</span>
						</td>
						<td class="text-xs">{link.clicks}</td>
						<td class="text-xs text-[rgb(var(--fg-subtle))]">{timeAgo(link.created_at)}</td>
						<td>
							<div class="flex items-center justify-end gap-0.5">
								<CopyButton text="{data.base}/short/{link.slug}" iconOnly />
								<a href="{data.base}/short/{link.slug}" target="_blank" rel="noreferrer" class="btn-icon h-8 w-8"><Icon name="external" size={13} /></a>
								<form method="POST" action="?/delete" use:enhance>
									<input type="hidden" name="id" value={link.id} />
									<button class="btn-icon h-8 w-8 hover:text-red-400" type="submit"><Icon name="trash" size={13} /></button>
								</form>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{:else}
	<div class="mt-5">
		<EmptyState icon="link" title="No short links yet" description="Paste a long URL above to create your first short link." />
	</div>
{/if}
