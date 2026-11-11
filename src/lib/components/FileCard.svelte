<script lang="ts">
	import type { FileWithMeta } from '$lib/types';
	import Icon from './Icon.svelte';
	import { formatNumber, prettyMime, truncate } from '$lib/utils/format';
	import { fileVisibility } from '$lib/visibility';

	let {
		file,
		href = undefined,
		showMeta = true,
		class: className = ''
	}: { file: FileWithMeta; href?: string; showMeta?: boolean; class?: string } = $props();

	const isImage = $derived(file.mime.startsWith('image/'));
	const isVideo = $derived(file.mime.startsWith('video/'));
	const link = $derived(href ?? `/p/${file.id}`);
</script>

<a
	href={link}
	class="group relative block overflow-hidden rounded-[18px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] shadow-[var(--shadow)] transition-all duration-300 hover:-translate-y-1 hover:border-[rgb(var(--border-strong))] hover:shadow-xl {className}"
>
	<div class="relative aspect-square overflow-hidden bg-[rgb(var(--surface-3))]">
		{#if isImage && (file.thumb_path || file.mime === 'image/svg+xml')}
			<img
				src={file.thumb_path ? `/t/${file.id}` : `/i/${file.id}`}
				alt={file.original_name}
				loading="lazy"
				decoding="async"
				class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
			/>
		{:else}
			<div class="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[rgb(var(--surface-2))] to-[rgb(var(--surface-3))]">
				<Icon name={isVideo ? 'film' : 'folder'} size={34} class="text-[rgb(var(--fg-subtle))]" />
				<span class="text-[11px] font-semibold uppercase tracking-wider text-[rgb(var(--fg-subtle))]">
					{prettyMime(file.mime)}
				</span>
			</div>
		{/if}

		<div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/0 to-black/0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"></div>

		<div class="absolute left-2 top-2 flex flex-wrap gap-1">
			{#if fileVisibility(file) === 'private'}
				<span class="badge bg-black/55 text-white backdrop-blur"><Icon name="lock" size={11} /> Private</span>
			{:else if fileVisibility(file) === 'unlisted'}
				<span class="badge bg-black/55 text-white backdrop-blur"><Icon name="link" size={11} /> Unlisted</span>
			{/if}
			{#if file.ext === 'gif'}
				<span class="badge bg-black/55 text-white backdrop-blur">GIF</span>
			{/if}
			{#if isVideo}
				<span class="badge bg-black/55 text-white backdrop-blur"><Icon name="play" size={11} /> Video</span>
			{/if}
		</div>

		<div class="pointer-events-none absolute inset-x-0 bottom-0 translate-y-1 p-4 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
			<p class="truncate text-xs font-semibold text-white">{truncate(file.original_name, 34)}</p>
			<div class="mt-1 flex items-center gap-3 text-[11px] text-white/70">
				<span class="inline-flex items-center gap-1"><Icon name="eye" size={11} /> {formatNumber(file.views)}</span>
				<span class="inline-flex items-center gap-1"><Icon name="heart" size={11} /> {formatNumber(file.likes ?? 0)}</span>
				{#if file.width && file.height}<span>{file.width}×{file.height}</span>{/if}
			</div>
		</div>
	</div>

	{#if showMeta}
		<div class="flex items-center justify-between gap-2 px-4 py-3.5">
			<p class="truncate text-sm font-semibold text-[rgb(var(--fg))]">{truncate(file.original_name, 26)}</p>
			{#if file.username}
				<span class="truncate text-[11px] text-[rgb(var(--fg-subtle))]">@{file.username}</span>
			{/if}
		</div>
	{/if}
</a>
