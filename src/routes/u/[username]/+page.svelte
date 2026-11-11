<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/stores';
	import Avatar from '$lib/components/Avatar.svelte';
	import FileCard from '$lib/components/FileCard.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Pagination from '$lib/components/Pagination.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { formatDate, formatNumber } from '$lib/utils/format';

	let { data }: { data: PageData } = $props();

	function buildHref(p: number) {
		return `?page=${p}`;
	}
</script>

<svelte:head>
	<title>@{data.profile.username} · {data.site.siteName}</title>
	<meta name="description" content={data.profile.bio || `Public uploads by @${data.profile.username}`} />
</svelte:head>

<div class="mx-auto max-w-[1440px] px-5 py-10 sm:px-8">
	<div class="relative overflow-hidden rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]">
		<div class="h-28 bg-gradient-to-r from-accent/30 via-fuchsia-500/20 to-sky-500/20 sm:h-36">
			<div class="h-full w-full opacity-40" style="background-image:radial-gradient(circle at 20% 50%, rgb(var(--accent)/.6), transparent 40%), radial-gradient(circle at 80% 20%, rgba(217,70,239,.5), transparent 35%)"></div>
		</div>
		<div class="px-6 pb-7 sm:px-8">
			<div class="-mt-10 flex flex-wrap items-end justify-between gap-4">
				<div class="flex items-end gap-4">
					<Avatar name={data.profile.username} src={data.profile.avatar_url} size={84} class="ring-4 ring-[rgb(var(--surface))]" />
					<div class="pb-1">
						<h1 class="text-xl font-bold tracking-tight">@{data.profile.username}</h1>
						<p class="mt-0.5 text-xs text-[rgb(var(--fg-subtle))]">
							{data.profile.role === 'admin' ? 'Administrator' : 'Member'} · joined {formatDate(data.profile.created_at)}
						</p>
					</div>
				</div>
				<div class="flex gap-2 pb-1">
					{#if data.isOwner}
						<a href="/dashboard/settings" class="btn-secondary btn-sm"><Icon name="edit" size={14} /> Edit profile</a>
					{:else if data.user}
						<a href="/dashboard/upload" class="btn-primary btn-sm"><Icon name="upload" size={14} /> Upload</a>
					{:else}
						<a href="/login?next=/dashboard/upload" class="btn-primary btn-sm"><Icon name="login" size={14} /> Sign in to upload</a>
					{/if}
				</div>
			</div>

			{#if data.profile.bio}
				<p class="mt-4 max-w-2xl text-sm leading-relaxed text-[rgb(var(--fg-muted))]">{data.profile.bio}</p>
			{:else}
				<p class="mt-4 text-sm italic text-[rgb(var(--fg-subtle))]">No bio yet.</p>
			{/if}

			<div class="mt-5 flex flex-wrap gap-2">
				<span class="badge"><Icon name="images" size={12} /> {formatNumber(data.total)} public files</span>
				<span class="badge"><Icon name="folder" size={12} /> {data.collections.length} collections</span>
				<a href="/explore" class="badge hover:text-accent"><Icon name="globe" size={12} /> Explore</a>
			</div>
		</div>
	</div>

	{#if data.files.length}
		<div class="mt-14">
			<h2 class="mb-4 text-lg font-bold tracking-tight">Uploads</h2>
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
				{#each data.files as file (file.id)}
					<FileCard {file} />
				{/each}
			</div>
			{#if data.pages > 1}
				<div class="mt-14"><Pagination page={data.page} pages={data.pages} {buildHref} /></div>
			{/if}
		</div>
	{:else}
		<div class="mt-14">
			<EmptyState icon="images" title="No public uploads" description="This user hasn't shared anything publicly yet." />
		</div>
	{/if}

	{#if data.collections.length}
		<div class="mt-14">
			<h2 class="mb-4 text-lg font-bold tracking-tight">Collections</h2>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.collections as collection (collection.id)}
					<a href="/c/{collection.slug}" class="card-flat group flex items-center gap-3 p-4 transition hover:border-[rgb(var(--border-strong))]">
						<span class="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent"><Icon name="folder" size={19} /></span>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-semibold">{collection.name}</p>
							<p class="text-[11px] text-[rgb(var(--fg-subtle))]">{collection.file_count ?? 0} public files</p>
						</div>
						<Icon name="arrowUpRight" size={15} class="text-[rgb(var(--fg-subtle))] group-hover:text-accent" />
					</a>
				{/each}
			</div>
		</div>
	{/if}
</div>
