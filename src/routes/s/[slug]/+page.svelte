<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import Icon from '$lib/components/Icon.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import { formatBytes, formatDate, timeAgo } from '$lib/utils/format';

	let { data, form }: { data: PageData; form: (ActionData & Record<string, any>) | null } = $props();

	const file = $derived(data.file);
	const isImage = $derived(!!file && file.mime.startsWith('image/'));
	const isVideo = $derived(!!file && file.mime.startsWith('video/'));
</script>

<svelte:head>
	<title>{data.state === 'ok' && file ? `${file.original_name} · Shared on ${data.site.siteName}` : `Shared link · ${data.site.siteName}`}</title>
	{#if data.state === 'ok' && file}
		<meta property="og:title" content={file.original_name} />
		<meta property="og:image" content={data.cdn} />
	{/if}
</svelte:head>

<div class="mx-auto max-w-5xl px-5 py-12 sm:px-8">
	<div class="mb-6 flex items-center justify-center gap-2 text-xs text-[rgb(var(--fg-subtle))]">
		<Icon name="lock" size={12} />
		Shared via {data.site.siteName}
		{#if data.share?.views !== undefined}
			<span>· {data.share.views} view{data.share.views === 1 ? '' : 's'}</span>
		{/if}
	</div>

	{#if data.state === 'expired'}
		<div class="card mx-auto max-w-md p-10 text-center">
			<span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
				<Icon name="clock" size={26} />
			</span>
			<h1 class="mt-4 text-xl font-bold">This share has expired</h1>
			<p class="mt-2 text-sm text-[rgb(var(--fg-muted))]">
				The link is no longer available. Ask the owner to generate a fresh one.
			</p>
			<a href="/" class="btn-secondary mt-6">Go to {data.site.siteName}</a>
		</div>
	{:else if data.state === 'missing'}
		<div class="card mx-auto max-w-md p-10 text-center">
			<span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
				<Icon name="alert" size={26} />
			</span>
			<h1 class="mt-4 text-xl font-bold">The file is gone</h1>
			<p class="mt-2 text-sm text-[rgb(var(--fg-muted))]">The owner has deleted or hidden this file.</p>
		</div>
	{:else if data.state === 'locked'}
		<div class="card mx-auto max-w-md p-10">
			<span class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
				<Icon name="lock" size={26} />
			</span>
			<h1 class="mt-4 text-center text-xl font-bold">Password required</h1>
			<p class="mt-2 text-center text-sm text-[rgb(var(--fg-muted))]">
				This share is protected. Enter the password to view the file.
			</p>

			{#if form?.error}
				<div class="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
					{form.error}
				</div>
			{/if}

			<form method="POST" class="mt-5 space-y-3">
				<input name="password" type="password" class="input" placeholder="Share password" autocomplete="off" required autofocus />
				<button class="btn-primary w-full" type="submit"><Icon name="unlock" size={15} /> Unlock</button>
			</form>
		</div>
	{:else if data.state === 'ok' && file}
		<div class="card overflow-hidden">
			<div class="flex min-h-[280px] items-center justify-center bg-[#06070b] p-2">
				{#if isImage}
					<img src={data.cdn} alt={file.original_name} class="max-h-[70vh] w-auto max-w-full rounded-xl object-contain" />
				{:else if isVideo}
					<video src={data.cdn} controls class="max-h-[70vh] w-full rounded-xl"></video>
				{:else}
					<div class="flex flex-col items-center gap-3 py-16 text-center">
						<span class="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 text-white/60"><Icon name="folder" size={28} /></span>
						<p class="max-w-xs truncate text-sm text-white/80">{file.original_name}</p>
						<a href="{data.cdn}?download=1" class="btn-primary btn-sm"><Icon name="download" size={14} /> Download</a>
					</div>
				{/if}
			</div>

			<div class="grid gap-7 p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
				<div class="min-w-0">
					<h1 class="break-words text-lg font-bold leading-snug">{file.original_name}</h1>
					<div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-[rgb(var(--fg-subtle))]">
						<span class="badge">{formatBytes(file.size)}</span>
						{#if file.width && file.height}<span class="badge">{file.width}×{file.height}</span>{/if}
						{#if data.share?.expires_at}
							<span class="badge badge-warning"><Icon name="clock" size={10} /> expires {formatDate(data.share.expires_at)}</span>
						{/if}
						<span>created {timeAgo(file.created_at)}</span>
					</div>

					<div class="mt-4 flex flex-wrap gap-2">
						<CopyButton text={data.url ?? ''} label="Copy share link" class="btn-secondary btn-sm" />
						<a href="{data.cdn}?download=1" class="btn-primary btn-sm"><Icon name="download" size={14} /> Download</a>
					</div>
				</div>

				{#if data.qr}
					<div class="justify-self-center text-center sm:justify-self-end">
						<img src={data.qr} alt="QR code for this share link" class="h-32 w-32 rounded-xl border border-[rgb(var(--border))] bg-white p-1.5" />
						<p class="mt-1.5 inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-[rgb(var(--fg-subtle))]">
							<Icon name="qr" size={10} /> Scan to open
						</p>
					</div>
				{/if}
			</div>
		</div>

		<p class="mt-6 text-center text-xs text-[rgb(var(--fg-subtle))]">
			Want your own private shares? <a href="/register" class="font-semibold text-accent hover:underline">Create an account</a> on {data.site.siteName}.
		</p>
	{/if}
</div>
