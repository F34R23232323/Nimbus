<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/stores';
	import Icon from '$lib/components/Icon.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { formatDate } from '$lib/utils/format';

	let { data }: { data: PageData } = $props();

	const images = $derived(
		[...data.files].filter((file) => file.mime.startsWith('image/') && file.thumb_path)
	);
	const previews = $derived(images.slice(0, 3));
	const shareUrl = $derived(`${$page.url.origin}/c/${data.collection.slug}`);
</script>

<svelte:head>
	<title>{data.collection.name} · {data.site.siteName}</title>
	<meta name="description" content={data.collection.description || `A collection of ${data.files.length} files.`} />
	{#if previews[0]}<meta property="og:image" content="/t/{previews[0].id}" />{/if}
</svelte:head>

<div class="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 sm:py-14">
	<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
		<div class="flex flex-wrap items-center gap-2 text-xs text-[rgb(var(--fg-subtle))]">
			<a href="/explore" class="transition hover:text-[rgb(var(--fg))]">Explore</a>
			{#each data.ancestors as ancestor (ancestor.id)}
				<Icon name="chevronRight" size={11} />
				<a href="/c/{ancestor.slug}" class="truncate transition hover:text-[rgb(var(--fg))]">{ancestor.name}</a>
			{/each}
			<Icon name="chevronRight" size={11} />
			<span class="truncate text-[rgb(var(--fg-muted))]">{data.collection.name}</span>
		</div>
		{#if data.isOwner}
			<a href="/dashboard/collections/{data.collection.id}" class="btn-secondary btn-sm"><Icon name="settings" size={14} /> Manage</a>
		{/if}
	</div>

	<section class="grid overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] lg:grid-cols-[1.15fr_0.85fr]">
		<div class="relative min-h-[240px] bg-[rgb(var(--surface-2))] p-2.5 sm:min-h-[320px]">
			{#if previews.length}
				<div class="grid h-[220px] grid-cols-2 grid-rows-2 gap-2 sm:h-[300px]">
					{#each previews as file, index (file.id)}
						<a
							href="/p/{file.id}"
							class="group relative overflow-hidden rounded-2xl bg-[rgb(var(--surface-3))] {index === 0 && previews.length === 3
								? 'row-span-2'
								: ''} {previews.length === 1 ? 'col-span-2 row-span-2' : ''} {previews.length === 2 ? 'row-span-2' : ''}"
						>
							<img
								src="/t/{file.id}"
								alt=""
								class="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
								loading={index === 0 ? 'eager' : 'lazy'}
							/>
						</a>
					{/each}
				</div>
			{:else}
				<div class="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-accent/15 via-[rgb(var(--surface-2))] to-fuchsia-500/10">
					<span class="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent"><Icon name="folder" size={28} /></span>
					<p class="text-sm text-[rgb(var(--fg-subtle))]">No previews yet</p>
				</div>
			{/if}
		</div>

		<div class="flex flex-col justify-between gap-6 p-6 sm:p-8">
			<div>
				<div class="flex flex-wrap items-center gap-2">
					<span class="badge badge-accent"><Icon name="folder" size={11} /> Collection</span>
					<span class="badge">{data.files.length} file{data.files.length === 1 ? '' : 's'}</span>
				</div>
				<h1 class="mt-4 page-title">{data.collection.name}</h1>
				{#if data.owner}
					<a href="/u/{data.owner.username}" class="mt-3 inline-flex items-center gap-2 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] py-1 pl-1 pr-3 text-xs font-medium transition hover:border-[rgb(var(--border-strong))]">
						<Avatar name={data.owner.username} src={data.owner.avatar_url} size={24} />
						@{data.owner.username}
					</a>
				{/if}
				{#if data.collection.description}
					<p class="mt-4 text-sm leading-relaxed text-[rgb(var(--fg-muted))]">{data.collection.description}</p>
				{/if}
				<p class="mt-4 text-[11px] text-[rgb(var(--fg-subtle))]">Created {formatDate(data.collection.created_at)}</p>
			</div>

			{#if shareUrl}
				<div>
					<p class="label">Collection link</p>
					<div class="flex items-center gap-2 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] py-1.5 pl-3 pr-1.5">
						<Icon name="link" size={14} class="shrink-0 text-[rgb(var(--fg-subtle))]" />
						<code class="min-w-0 flex-1 truncate text-xs text-[rgb(var(--fg-muted))]">{shareUrl}</code>
						<CopyButton text={shareUrl} iconOnly class="btn-icon h-8 w-8" />
					</div>
				</div>
			{/if}
		</div>
	</section>

	{#if data.children.length}
		<section class="mt-8">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="section-title">Subfolders</h2>
				<span class="badge">{data.children.length} folder{data.children.length === 1 ? '' : 's'}</span>
			</div>
			<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{#each data.children as child (child.id)}
					{@const cover = child.preview_ids?.split(',')[0]}
					<a
						href="/c/{child.slug}"
						class="group flex items-center gap-3 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 transition hover:-translate-y-0.5 hover:border-[rgb(var(--border-strong))] hover:shadow-lg"
					>
						<span class="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-accent/15 to-fuchsia-500/10 text-accent">
							{#if cover}
								<img src="/t/{cover}" alt="" class="absolute inset-0 h-full w-full object-cover" loading="lazy" />
							{:else}
								<Icon name="folder" size={20} />
							{/if}
						</span>
						<span class="min-w-0 flex-1">
							<span class="block truncate text-sm font-semibold">{child.name}</span>
							<span class="mt-0.5 block text-[11px] text-[rgb(var(--fg-subtle))]">
								{child.file_count ?? 0} file{child.file_count === 1 ? '' : 's'}{#if child.child_count} · {child.child_count} folder{child.child_count === 1 ? '' : 's'}{/if}
							</span>
						</span>
						<Icon name="chevronRight" size={15} class="shrink-0 text-[rgb(var(--fg-subtle))] transition group-hover:text-accent" />
					</a>
				{/each}
			</div>
		</section>
	{/if}

	<section class="mt-8">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="section-title">Files</h2>
			<span class="badge">{data.files.length} total</span>
		</div>

		{#if data.files.length}
			<div class="columns-1 gap-4 sm:columns-2 xl:columns-3">
				{#each data.files as file (file.id)}
					<a href="/p/{file.id}" class="group mb-4 block break-inside-avoid overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] transition hover:border-[rgb(var(--border-strong))] hover:shadow-xl">
						{#if file.mime.startsWith('image/') && file.thumb_path}
							<img src="/t/{file.id}" alt={file.original_name} loading="lazy" class="h-auto w-full object-cover transition duration-500 group-hover:scale-[1.02]" />
						{:else}
							<span class="flex aspect-video w-full flex-col items-center justify-center gap-2 bg-[rgb(var(--surface-3))] text-[rgb(var(--fg-subtle))]">
								<Icon name={file.mime.startsWith('video/') ? 'film' : 'folder'} size={30} />
								<span class="text-[10px] font-semibold uppercase tracking-wider">{file.ext}</span>
							</span>
						{/if}
						<span class="flex items-center justify-between gap-3 px-4 py-3">
							<span class="min-w-0">
								<span class="block truncate text-sm font-semibold">{file.original_name}</span>
								<span class="mt-0.5 block text-[11px] text-[rgb(var(--fg-subtle))]">{file.username ? `@${file.username}` : ''}</span>
							</span>
							<Icon name="arrowUpRight" size={15} class="shrink-0 text-[rgb(var(--fg-subtle))] transition group-hover:text-accent" />
						</span>
					</a>
				{/each}
			</div>
		{:else}
			<EmptyState icon="images" title="Nothing here yet" description="This collection doesn't contain any public files." />
		{/if}
	</section>
</div>
