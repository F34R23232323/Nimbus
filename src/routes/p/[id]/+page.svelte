<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import Avatar from '$lib/components/Avatar.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import FileCard from '$lib/components/FileCard.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { formatBytes, formatDate, timeAgo, truncate } from '$lib/utils/format';
	import { fileVisibility } from '$lib/visibility';

	let { data, form }: { data: PageData; form: (ActionData & Record<string, any>) | null } = $props();

	const file = $derived(data.file);
	const isImage = $derived(file.mime.startsWith('image/'));
	const isVideo = $derived(file.mime.startsWith('video/'));
	let reportOpen = $state(false);
</script>

<svelte:head>
	<title>{file.original_name} · {data.site.siteName}</title>
	<meta property="og:title" content={file.original_name} />
	<meta property="og:description" content={`${file.width ?? ''}${file.height ? '×' + file.height : ''} · ${formatBytes(file.size)}`} />
	{#if file.is_public}
		<meta property="og:image" content={data.directUrl} />
	{/if}
</svelte:head>

<div class="mx-auto max-w-[1440px] px-5 py-12 sm:px-8">
	<div class="mb-5 flex flex-wrap items-center gap-2 text-xs text-[rgb(var(--fg-subtle))]">
		<a href="/explore" class="inline-flex items-center gap-1 hover:text-[rgb(var(--fg))]"><Icon name="globe" size={12} /> Explore</a>
		<Icon name="chevronRight" size={11} />
		<span class="truncate text-[rgb(var(--fg-muted))]">{truncate(file.original_name, 60)}</span>
		{#if fileVisibility(file) === 'private'}
			<span class="badge badge-warning ml-auto"><Icon name="lock" size={11} /> Private preview</span>
		{:else if fileVisibility(file) === 'unlisted'}
			<span class="badge badge-accent ml-auto"><Icon name="link" size={11} /> Unlisted — not in Explore</span>
		{/if}
	</div>

	<div class="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_390px]">
		<div class="space-y-6">
			<div class="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[#06070b] p-2 sm:min-h-[420px]">
				{#if isImage}
					<img
						src="/i/{file.id}"
						alt={file.original_name}
						class="max-h-[72vh] w-auto max-w-full rounded-xl object-contain"
						onerror={(event) => {
							const image = event.currentTarget as HTMLImageElement;
							if (image.dataset.fallback || !file.thumb_path) return;
							image.dataset.fallback = '1';
							image.src = `/t/${file.id}`;
						}}
					/>
				{:else if isVideo}
					<video src="/i/{file.id}" controls class="max-h-[72vh] w-full rounded-xl" preload="metadata"></video>
				{:else}
					<div class="flex flex-col items-center gap-3 py-16 text-center">
						<span class="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-white/60">
							<Icon name="folder" size={28} />
						</span>
						<p class="max-w-xs truncate text-sm font-medium text-white/80">{file.original_name}</p>
						<a href="/i/{file.id}?download=1" class="btn-primary btn-sm mt-1"><Icon name="download" size={14} /> Download file</a>
					</div>
				{/if}
			</div>

			{#if data.commentsEnabled && file.is_public}
				<section class="card-flat p-6">
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-sm font-semibold">Comments <span class="text-[rgb(var(--fg-subtle))]">({data.comments.length})</span></h2>
						{#if form?.error}<p class="text-xs text-red-400">{form.error}</p>{/if}
					</div>

					{#if data.user}
						<form method="POST" action="?/comment" use:enhance class="mb-5 flex gap-3">
							<Avatar name={data.user.username} src={data.user.avatar_url} size={32} class="mt-0.5" />
							<div class="flex-1">
								<textarea name="body" class="textarea min-h-[76px]" placeholder="Share some feedback…" maxlength="2000" required></textarea>
								<div class="mt-2 flex justify-end">
									<button class="btn-secondary btn-sm" type="submit">Post comment</button>
								</div>
							</div>
						</form>
					{:else}
						<p class="mb-5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-3.5 py-3 text-xs text-[rgb(var(--fg-muted))]">
							<a href="/login" class="font-semibold text-accent hover:underline">Sign in</a> to join the conversation.
						</p>
					{/if}

					{#if data.comments.length}
						<ul class="space-y-5">
							{#each data.comments as comment (comment.id)}
								<li class="flex gap-3">
									<Avatar name={comment.username ?? '?'} src={comment.avatar_file_id ? `/t/${comment.avatar_file_id}` : null} size={30} class="mt-0.5" />
									<div class="min-w-0 flex-1">
										<div class="flex flex-wrap items-baseline gap-2">
											<a href="/u/{comment.username}" class="text-xs font-semibold hover:text-accent">@{comment.username}</a>
											<span class="text-[11px] text-[rgb(var(--fg-subtle))]" title={formatDate(comment.created_at, true)}>{timeAgo(comment.created_at)}</span>
											{#if data.user && (data.user.id === comment.user_id || data.user.role === 'admin')}
												<form method="POST" action="?/deleteComment" use:enhance class="ml-auto">
													<input type="hidden" name="commentId" value={comment.id} />
													<button class="text-[11px] text-[rgb(var(--fg-subtle))] hover:text-red-400" type="submit">Delete</button>
												</form>
											{/if}
										</div>
										<p class="prose-nimbus mt-1 whitespace-pre-wrap break-words">{comment.body}</p>
									</div>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="py-4 text-center text-xs text-[rgb(var(--fg-subtle))]">No comments yet. Start the thread!</p>
					{/if}
				</section>
			{/if}
		</div>

		<aside class="space-y-4 lg:sticky lg:top-20">
			<div class="card-flat p-6">
				<h1 class="break-words text-lg font-bold leading-snug">{file.original_name}</h1>

				{#if file.username}
					<a href="/u/{file.username}" class="mt-3 flex items-center gap-2.5 rounded-xl p-1 transition hover:bg-[rgb(var(--surface-2))]">
						<Avatar name={file.username} src={file.avatar_file_id ? `/t/${file.avatar_file_id}` : null} size={34} />
						<div>
							<p class="text-sm font-semibold">@{file.username}</p>
							<p class="text-[11px] text-[rgb(var(--fg-subtle))]">Uploaded {timeAgo(file.created_at)}</p>
						</div>
					</a>
				{/if}

				<div class="mt-4 grid grid-cols-3 gap-2 text-center">
					<div class="rounded-xl bg-[rgb(var(--surface-2))] px-2 py-2.5">
						<p class="text-sm font-bold">{file.views}</p>
						<p class="text-[10px] uppercase tracking-wide text-[rgb(var(--fg-subtle))]">Views</p>
					</div>
					<div class="rounded-xl bg-[rgb(var(--surface-2))] px-2 py-2.5">
						<p class="text-sm font-bold">{file.likes ?? 0}</p>
						<p class="text-[10px] uppercase tracking-wide text-[rgb(var(--fg-subtle))]">Likes</p>
					</div>
					<div class="rounded-xl bg-[rgb(var(--surface-2))] px-2 py-2.5">
						<p class="text-sm font-bold">{formatBytes(file.size)}</p>
						<p class="text-[10px] uppercase tracking-wide text-[rgb(var(--fg-subtle))]">Size</p>
					</div>
				</div>

				<div class="mt-4 grid gap-2">
					{#if file.is_public}
						<div class="flex gap-2">
							<CopyButton text={data.directUrl} label="Copy link" class="btn-secondary btn-sm flex-1" />
							<CopyButton text={`![${file.original_name}](${data.directUrl})`} label="Markdown" class="btn-secondary btn-sm flex-1" />
						</div>
					{/if}
					<a href="/i/{file.id}?download=1" class="btn-primary btn-sm w-full"><Icon name="download" size={14} /> Download</a>
					{#if data.canManage}
						<a href="/dashboard/images/{file.id}" class="btn-ghost btn-sm w-full"><Icon name="settings" size={14} /> Manage &amp; share</a>
					{/if}
				</div>

				{#if data.user}
					<div class="mt-3 grid grid-cols-2 gap-2">
						<form method="POST" action="?/like" use:enhance>
							<button class="btn-secondary btn-sm w-full {data.liked ? 'text-rose-400' : ''}" type="submit">
								<Icon name="heart" size={14} /> {data.liked ? 'Liked' : 'Like'} ({file.likes ?? 0})
							</button>
						</form>
						<form method="POST" action="?/bookmark" use:enhance>
							<button class="btn-secondary btn-sm w-full {data.bookmarked ? 'text-accent' : ''}" type="submit">
								<Icon name="bookmark" size={14} /> {data.bookmarked ? 'Saved' : 'Save'}
							</button>
						</form>
					</div>
				{/if}

				{#if file.tags?.length}
					<div class="mt-4 flex flex-wrap gap-1.5">
						{#each file.tags as tag (tag.id)}
							<a href="/explore?tag={encodeURIComponent(tag.slug)}" class="chip">#{tag.name}</a>
						{/each}
					</div>
				{/if}

				<dl class="mt-5 space-y-2 border-t border-[rgb(var(--border))] pt-4 text-xs">
					<div class="flex justify-between gap-3">
						<dt class="text-[rgb(var(--fg-subtle))]">Type</dt>
						<dd class="font-medium">{file.mime}</dd>
					</div>
					{#if file.width && file.height}
						<div class="flex justify-between gap-3">
							<dt class="text-[rgb(var(--fg-subtle))]">Dimensions</dt>
							<dd class="font-medium">{file.width} × {file.height}{file.pages > 1 ? ` · ${file.pages} frames` : ''}</dd>
						</div>
					{/if}
					<div class="flex justify-between gap-3">
						<dt class="text-[rgb(var(--fg-subtle))]">Uploaded</dt>
						<dd class="font-medium">{formatDate(file.created_at, true)}</dd>
					</div>
					<div class="flex justify-between gap-3">
						<dt class="text-[rgb(var(--fg-subtle))]">File ID</dt>
						<dd class="font-mono text-[11px] font-medium">{file.id}</dd>
					</div>
				</dl>

				{#if file.is_public}
					<button class="mt-4 text-[11px] text-[rgb(var(--fg-subtle))] transition hover:text-[rgb(var(--fg-muted))]" onclick={() => (reportOpen = true)}>
						Report this file
					</button>
				{/if}
				{#if form?.reported}
					<p class="mt-2 text-xs text-emerald-400">Thanks — the report was sent to the moderators.</p>
				{/if}
			</div>
		</aside>
	</div>

	<Modal bind:open={reportOpen} title="Report this file" description="Tell the moderators what's wrong." size="sm">
		<form
			method="POST"
			action="?/report"
			use:enhance={() =>
				async ({ update }) => {
					reportOpen = false;
					await update();
				}}
			class="space-y-4"
		>
			<textarea name="reason" class="textarea min-h-[110px]" placeholder="What's wrong with it?" maxlength="500" required></textarea>
			<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<button type="button" class="btn-secondary" onclick={() => (reportOpen = false)}>Cancel</button>
				<button class="btn-primary" type="submit">Submit report</button>
			</div>
		</form>
	</Modal>

	{#if data.related.length}
		<section class="mt-14">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-lg font-bold tracking-tight">More to explore</h2>
				<a href="/explore" class="btn-ghost btn-sm">See all <Icon name="arrowRight" size={13} /></a>
			</div>
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
				{#each data.related as related (related.id)}
					<FileCard file={related} />
				{/each}
			</div>
		</section>
	{/if}
</div>
