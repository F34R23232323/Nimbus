<script lang="ts">
	import type { PageData } from './$types';
	import StatCard from '$lib/components/StatCard.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import FileCard from '$lib/components/FileCard.svelte';
	import { formatBytes, formatNumber, percent, timeAgo } from '$lib/utils/format';

	let { data }: { data: PageData } = $props();

	const maxActivity = $derived(Math.max(1, ...data.activity.map((day) => day.count)));
	const quotaPercent = $derived(data.quota > 0 ? percent(data.stats.size, data.quota) : 0);
	const used = $derived(data.stats.size);
</script>

<svelte:head><title>Dashboard · {data.site.siteName}</title></svelte:head>

<section class="dashboard-hero">
	<div class="relative z-10">
		<p class="dashboard-eyebrow"><span class="dashboard-eyebrow-dot"></span> YOUR CREATIVE HOME</p>
		<h1 class="dashboard-hero-title">Good to see you,<br /><span>{data.user.username}.</span></h1>
		<p class="dashboard-hero-copy">Everything you create, collect and share, all in one place.</p>
		<div class="mt-8 flex flex-wrap gap-3">
			<a href="/dashboard/upload" class="btn-primary"><Icon name="upload" size={17} /> Upload files</a>
			<a href="/dashboard/gif-studio" class="btn-secondary"><Icon name="film" size={17} /> Open GIF Studio</a>
		</div>
	</div>
	<div class="dashboard-hero-art" aria-hidden="true"><span></span><span></span><span></span></div>
</section>

{#if data.user.status === 'pending'}
	<div class="mt-5 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-500">
		<Icon name="clock" size={17} class="mt-0.5 shrink-0" />
		<p><span class="font-semibold">Your account is pending approval.</span> An administrator must approve it before you can upload.</p>
	</div>
{/if}

<div class="mt-9 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
	<StatCard label="Files" value={formatNumber(data.stats.count)} icon="images" hint={`${formatBytes(used)} stored`} />
	<StatCard label="Total views" value={formatNumber(data.stats.views)} icon="eye" tone="sky" hint="Across all uploads" />
	<StatCard label="Share links" value={formatNumber(data.stats.shares)} icon="link" tone="emerald" hint="Active expiring links" />
	<StatCard label="Collections" value={formatNumber(data.stats.collections)} icon="folder" tone="amber" hint="Grouped galleries" />
</div>

<div class="mt-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
	<div class="card-flat p-7 sm:p-8">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="section-title">Upload activity</h2>
				<p class="mt-1 text-sm text-[rgb(var(--fg-subtle))]">Your last 14 days at a glance</p>
			</div>
			<span class="badge badge-accent">{data.activity.reduce((sum, day) => sum + day.count, 0)} uploads</span>
		</div>
		<div class="mt-9 flex h-36 items-end gap-2">
			{#each data.activity as day (day.day)}
				<div class="group relative flex flex-1 flex-col items-center justify-end">
					<div
						class="w-full rounded-t-lg bg-accent/70 transition-all group-hover:bg-accent"
						style="height:{Math.max(4, (day.count / maxActivity) * 100)}%"
						title="{day.day}: {day.count} uploads"
					></div>
					<span class="mt-2 hidden text-[9px] text-[rgb(var(--fg-subtle))] sm:block">{day.day.slice(8)}</span>
				</div>
			{/each}
		</div>
	</div>

	<div class="card-flat flex flex-col p-7 sm:p-8">
		<div class="flex items-center justify-between">
			<h2 class="section-title">Storage</h2>
			<Icon name="database" size={16} class="text-[rgb(var(--fg-subtle))]" />
		</div>
		<p class="mt-7 text-4xl font-bold tracking-tight">{formatBytes(used)}</p>
		<p class="text-xs text-[rgb(var(--fg-subtle))]">
			{data.quota > 0 ? `of ${formatBytes(data.quota)} quota` : 'Unlimited quota'}
		</p>
		{#if data.quota > 0}
			<div class="mt-4 h-2 overflow-hidden rounded-full bg-[rgb(var(--surface-3))]">
				<div
					class="h-full rounded-full transition-all {quotaPercent > 90 ? 'bg-red-500' : 'bg-accent'}"
					style="width:{Math.min(100, quotaPercent)}%"
				></div>
			</div>
			<p class="mt-2 text-[11px] text-[rgb(var(--fg-subtle))]">{quotaPercent}% used · {formatBytes(Math.max(0, data.quota - used))} free</p>
		{/if}
		<div class="mt-7 grid grid-cols-2 gap-3">
			<a href="/dashboard/collections" class="panel flex flex-col items-center gap-1 px-2 py-3 text-center transition hover:border-accent/40">
				<Icon name="folder" size={16} class="text-accent" />
				<span class="text-xs font-medium">Collections</span>
			</a>
			<a href="/dashboard/tags" class="panel flex flex-col items-center gap-1 px-2 py-3 text-center transition hover:border-accent/40">
				<Icon name="tag" size={16} class="text-accent" />
				<span class="text-xs font-medium">Tags</span>
			</a>
			<a href="/dashboard/links" class="panel flex flex-col items-center gap-1 px-2 py-3 text-center transition hover:border-accent/40">
				<Icon name="link" size={16} class="text-accent" />
				<span class="text-xs font-medium">Shortener</span>
			</a>
			<a href="/dashboard/settings" class="panel flex flex-col items-center gap-1 px-2 py-3 text-center transition hover:border-accent/40">
				<Icon name="settings" size={16} class="text-accent" />
				<span class="text-xs font-medium">Settings</span>
			</a>
		</div>
	</div>
</div>

<div class="mt-12 grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
	<section>
		<div class="mb-5 flex items-center justify-between">
			<h2 class="section-title">Recent uploads</h2>
			<a href="/dashboard/images" class="text-sm font-semibold text-accent hover:underline">View all</a>
		</div>
		{#if data.recent.length}
			<div class="grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-4">
				{#each data.recent as file (file.id)}
					<FileCard {file} href="/dashboard/images/{file.id}" showMeta={false} />
				{/each}
			</div>
		{:else}
			<a href="/dashboard/upload" class="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[rgb(var(--border-strong))] px-4 py-12 text-center transition hover:border-accent/50">
				<Icon name="upload" size={22} class="text-accent" />
				<p class="text-sm font-medium">No uploads yet</p>
				<p class="text-xs text-[rgb(var(--fg-subtle))]">Drop your first file to get started.</p>
			</a>
		{/if}
	</section>

	<section class="card-flat p-7 sm:p-8">
		<div class="mb-3 flex items-center justify-between">
			<h2 class="section-title">Latest share links</h2>
			<Icon name="link" size={15} class="text-[rgb(var(--fg-subtle))]" />
		</div>
		{#if data.shares.length}
			<ul class="space-y-3">
				{#each data.shares as share (share.id)}
					<li class="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-3 py-2.5">
						<div class="flex items-center gap-2">
							<div class="min-w-0 flex-1">
								<p class="truncate text-xs font-medium">{share.original_name}</p>
								<p class="mt-0.5 text-[10px] text-[rgb(var(--fg-subtle))]">/s/{share.slug} · {timeAgo(share.created_at)}</p>
							</div>
							<a href="/s/{share.slug}" target="_blank" rel="noreferrer" class="btn-icon h-7 w-7">
								<Icon name="external" size={13} />
							</a>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="rounded-xl bg-[rgb(var(--surface-2))] px-3 py-6 text-center text-xs text-[rgb(var(--fg-subtle))]">
				Share links you create will appear here.
			</p>
		{/if}
	</section>
</div>
