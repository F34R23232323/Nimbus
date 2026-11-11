<script lang="ts">
	import type { PageData } from './$types';
	import FileCard from '$lib/components/FileCard.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { formatBytes, formatNumber } from '$lib/utils/format';

	let { data }: { data: PageData } = $props();

	const features = [
		{
			icon: 'lock',
			title: 'Private-first sharing',
			text: 'Every share can be password protected, view-limited and set to expire automatically. You decide who sees what.'
		},
		{
			icon: 'film',
			title: 'GIF Studio built in',
			text: 'Turn a still image into an animated loop, stitch a slideshow together, or convert animated files — no external tools.'
		},
		{
			icon: 'discord',
			title: 'Discord bot included',
			text: 'Drop a file in the chat and get a URL back. Convert to GIF and create share links right inside Discord.'
		}
	];
</script>

<svelte:head>
	<title>{data.site.siteName} — {data.site.siteDescription}</title>
</svelte:head>

<div class="landing-hero-wrap relative overflow-hidden border-b border-[rgb(var(--border))]">

	<section class="relative mx-auto max-w-[1540px] px-5 pb-20 pt-20 sm:px-8 sm:pb-28 sm:pt-28">
		<div class="landing-hero-grid">
		<div class="landing-hero-content reveal">
			<a href="/explore" class="badge badge-accent">
				<span class="relative flex h-1.5 w-1.5"><span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70"></span><span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent"></span></span>
				{formatNumber(data.stats.count)} files hosted · explore what people share
				<Icon name="chevronRight" size={11} />
			</a>

			<h1 class="landing-headline mt-8 text-balance">
				A home for<br />
				<span class="text-accent">everything you share.</span>
			</h1>
			<p class="mt-8 max-w-2xl text-pretty text-base leading-7 text-[rgb(var(--fg-muted))] sm:text-xl sm:leading-8">
				Beautifully organized images, effortless sharing, and creative tools in a space that feels entirely yours.
			</p>

			<div class="mt-9 flex flex-wrap items-center gap-3">
				<a href="/explore" class="btn-primary px-6 py-3 text-base"><Icon name="globe" size={17} /> Explore gallery</a>
				{#if data.user}
					<a href="/dashboard" class="btn-secondary px-6 py-3 text-base"><Icon name="grid" size={17} /> Open dashboard</a>
				{:else}
					<a href="/login" class="btn-secondary px-6 py-3 text-base"><Icon name="login" size={17} /> Sign in</a>
				{/if}
			</div>

			<div class="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-[rgb(var(--border-strong))] pt-5 text-xs font-semibold text-[rgb(var(--fg-subtle))]">
				<span class="inline-flex items-center gap-1.5"><Icon name="check" size={13} class="text-emerald-400" /> {data.site.allowedExtensions.slice(0, 8).join(', ')}</span>
				<span class="inline-flex items-center gap-1.5"><Icon name="database" size={13} /> {formatBytes(data.stats.size)} stored</span>
				<span class="inline-flex items-center gap-1.5"><Icon name="eye" size={13} /> {formatNumber(data.stats.views)} views</span>
			</div>
		</div>
		<aside class="landing-portal reveal" aria-label="Quick navigation">
			<div class="landing-portal-art" aria-hidden="true"><span></span><span></span><span></span></div>
			<p class="landing-portal-kicker">THE STUDIO</p>
			<h2>Make room for<br /><em>what matters.</em></h2>
			<p class="landing-portal-copy">A direct route to the places you use most.</p>
			<div class="landing-portal-links">
				<a href="/explore"><span><Icon name="globe" size={17} /> Explore gallery</span><Icon name="arrowUpRight" size={16} /></a>
				<a href={data.user ? '/dashboard/images' : '/login?next=/dashboard/images'}><span><Icon name="images" size={17} /> Your library</span><Icon name="arrowUpRight" size={16} /></a>
				<a href={data.user ? '/dashboard/gif-studio' : '/login?next=/dashboard/gif-studio'}><span><Icon name="film" size={17} /> GIF Studio</span><Icon name="arrowUpRight" size={16} /></a>
			</div>
		</aside>
		</div>

		<div class="landing-features mt-24 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{#each features as feature, i (feature.title)}
				<div class="group card-flat p-8 transition lg:p-10 animate-fade-up" style="animation-delay:{i * 70}ms">
					<span class="mb-12 flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition duration-300 group-hover:-rotate-6 group-hover:scale-110">
						<Icon name={feature.icon} size={19} />
					</span>
					<h3 class="text-xl font-semibold">{feature.title}</h3>
					<p class="mt-3 text-sm leading-6 text-[rgb(var(--fg-muted))]">{feature.text}</p>
				</div>
			{/each}
		</div>
	</section>
</div>

{#if data.recent.length}
	<section class="mx-auto max-w-[1440px] px-5 py-8 sm:px-8">
		<div class="mb-5 flex items-end justify-between gap-4">
			<div>
				<h2 class="text-xl font-bold tracking-tight">Fresh from the community</h2>
				<p class="mt-1 text-sm text-[rgb(var(--fg-muted))]">The latest public uploads across this instance.</p>
			</div>
			<a href="/explore" class="btn-ghost btn-sm">View all <Icon name="arrowRight" size={14} /></a>
		</div>
		<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
			{#each data.recent as file (file.id)}
				<FileCard {file} />
			{/each}
		</div>
	</section>
{/if}

{#if data.tags.length}
	<section class="mx-auto max-w-[1440px] px-5 py-12 sm:px-8">
		<div class="flex flex-wrap items-center gap-2">
			<span class="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--fg-subtle))]">
				<Icon name="tag" size={13} /> Trending tags
			</span>
			{#each data.tags as tag (tag.id)}
				<a href="/explore?tag={encodeURIComponent(tag.slug)}" class="chip">
					#{tag.name}
					<span class="text-[10px] text-[rgb(var(--fg-subtle))]">{tag.file_count}</span>
				</a>
			{/each}
		</div>
	</section>
{/if}

{#if data.collections.length}
	<section class="mx-auto max-w-[1440px] px-5 py-8 sm:px-8">
		<div class="mb-5">
			<h2 class="text-xl font-bold tracking-tight">Public collections</h2>
			<p class="mt-1 text-sm text-[rgb(var(--fg-muted))]">Curated sets of media, shared as one link.</p>
		</div>
		<div class="grid gap-5 md:grid-cols-3">
			{#each data.collections as collection (collection.id)}
				<a href="/c/{collection.slug}" class="card-flat group flex items-center gap-5 p-5 transition hover:border-[rgb(var(--border-strong))]">
					<span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
						<Icon name="folder" size={20} />
					</span>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-semibold">{collection.name}</p>
						<p class="mt-0.5 text-xs text-[rgb(var(--fg-subtle))]">
							{collection.file_count ?? 0} files {collection.username ? `· @${collection.username}` : ''}
						</p>
					</div>
					<Icon name="arrowUpRight" size={16} class="text-[rgb(var(--fg-subtle))] transition group-hover:text-accent" />
				</a>
			{/each}
		</div>
	</section>
{/if}
