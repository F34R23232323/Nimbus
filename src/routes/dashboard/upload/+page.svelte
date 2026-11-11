<script lang="ts">
	import type { PageData } from './$types';
	import Icon from '$lib/components/Icon.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import CollectionPicker from '$lib/components/CollectionPicker.svelte';
	import { toast } from '$lib/stores/ui';
	import { formatBytes, truncate } from '$lib/utils/format';
	import { fileVisibility } from '$lib/visibility';
	import type { Visibility } from '$lib/types';

	let { data }: { data: PageData } = $props();

	interface UploadResult {
		ok: boolean;
		file: {
			id: string;
			original_name: string;
			size: number;
			mime: string;
			thumb_path: string | null;
			is_public: number;
			listed: number;
		};
		url: string;
		absoluteUrl: string;
		markdown: string;
		duplicate?: boolean;
	}

	interface QueueItem {
		key: string;
		file: File;
		preview: string | null;
		progress: number;
		status: 'queued' | 'uploading' | 'done' | 'error';
		error?: string;
		result?: UploadResult;
	}

	let items = $state<QueueItem[]>([]);
	let dragging = $state(false);
	let uploading = $state(false);
	let visibility = $state<Visibility>(data.defaultVisibility);
	let compress = $state(data.compressByDefault);
	let tags = $state('');
	let collectionId = $state('');
	let fileInput: HTMLInputElement | undefined = $state();

	const accept = $derived(data.allowedExtensions.map((ext) => `.${ext}`).join(','));
	const done = $derived(items.filter((item) => item.status === 'done').length);
	const failed = $derived(items.filter((item) => item.status === 'error').length);
	const pending = $derived(
		items.filter(
			(item) => item.status === 'queued' || item.status === 'uploading' || item.status === 'error'
		).length
	);

	function addFiles(fileList: FileList | File[]) {
		const incoming = Array.from(fileList);
		if (!incoming.length) return;
		let added = 0;
		for (const file of incoming) {
			const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
			if (!data.allowedExtensions.includes(ext)) {
				toast(`${file.name} is not an allowed file type`, 'error', data.allowedExtensions.join(', '));
				continue;
			}
			if (file.size > data.maxUploadSize) {
				toast(`${file.name} is too large`, 'error', `Max ${formatBytes(data.maxUploadSize)}`);
				continue;
			}
			const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
			items = [
				...items,
				{
					key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
					file,
					preview,
					progress: 0,
					status: 'queued'
				}
			];
			added++;
		}
		if (added) toast(`${added} file${added === 1 ? '' : 's'} added to the queue`, 'success');
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		if (event.dataTransfer?.files) addFiles(event.dataTransfer.files);
	}

	function removeItem(key: string) {
		const item = items.find((entry) => entry.key === key);
		if (item?.preview) URL.revokeObjectURL(item.preview);
		items = items.filter((entry) => entry.key !== key);
	}

	function clearFinished() {
		for (const item of items) {
			if ((item.status === 'done' || item.status === 'error') && item.preview) {
				URL.revokeObjectURL(item.preview);
			}
		}
		items = items.filter((item) => item.status === 'queued' || item.status === 'uploading');
	}

	function uploadOne(item: QueueItem): Promise<void> {
		return new Promise((resolve) => {
			const xhr = new XMLHttpRequest();
			xhr.open('POST', '/api/upload');
			xhr.responseType = 'json';
			item.status = 'uploading';
			item.progress = 1;

			xhr.upload.onprogress = (event) => {
				if (event.lengthComputable) item.progress = Math.round((event.loaded / event.total) * 100);
			};

			xhr.onload = async () => {
				const response = (xhr.response ?? {}) as UploadResult & { error?: string };
				if (xhr.status >= 200 && xhr.status < 300 && response.ok) {
					item.status = 'done';
					item.progress = 100;
					item.result = response;
					if (collectionId && response.file?.id) {
						await fetch(`/api/files/${response.file.id}`, {
							method: 'PATCH',
							headers: { 'content-type': 'application/json' },
							body: JSON.stringify({ collectionId })
						}).catch(() => undefined);
					}
					if (response.duplicate) toast(`${item.file.name} already existed — reused the original`, 'info');
				} else {
					item.status = 'error';
					item.error = response?.error ?? `Upload failed (${xhr.status})`;
				}
				resolve();
			};

			xhr.onerror = () => {
				item.status = 'error';
				item.error = 'Network error while uploading.';
				resolve();
			};

			const form = new FormData();
			form.append('file', item.file);
			form.append('visibility', visibility);
			form.append('compress', compress ? '1' : '0');
			if (tags.trim()) form.append('tags', tags.trim());
			xhr.send(form);
		});
	}

	async function startUploads() {
		if (uploading) return;
		const queue = items.filter((item) => item.status === 'queued' || item.status === 'error');
		if (!queue.length) return;
		for (const item of queue) {
			item.status = 'queued';
			item.progress = 0;
			item.error = undefined;
		}
		uploading = true;
		let cursor = 0;

		async function worker() {
			while (cursor < queue.length) {
				const item = queue[cursor++];
				await uploadOne(item);
			}
		}

		await Promise.all([worker(), worker(), worker()]);
		uploading = false;
		if (failed === 0) toast('All uploads finished', 'success');
	}

	async function copyAll() {
		const links = items
			.filter((item) => item.status === 'done' && item.result)
			.map((item) => item.result!.absoluteUrl)
			.join('\n');
		if (!links) return;
		try {
			await navigator.clipboard.writeText(links);
			toast('All links copied', 'success');
		} catch {
			toast('Could not access the clipboard', 'error');
		}
	}
</script>

<svelte:head>
	<title>Upload · {data.site.siteName}</title>
	<meta name="description" content="Upload images and files and get shareable links instantly." />
</svelte:head>

<div class="max-w-6xl">
	<div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between gap-5">
		<div>
			<span class="badge badge-accent"><Icon name="upload" size={12} /> New upload</span>
			<h1 class="mt-3 page-title">Drop it like it's hot</h1>
			<p class="mt-1.5 max-w-xl text-sm text-[rgb(var(--fg-muted))]">
				Upload images or files, get direct links, Markdown and share pages. New uploads are private unless you make them public.
			</p>
		</div>
		<div class="text-xs text-[rgb(var(--fg-subtle))] sm:text-right">
			<p>Max file size <span class="font-semibold text-[rgb(var(--fg-muted))]">{formatBytes(data.maxUploadSize)}</span></p>
			<p class="mt-0.5">{data.allowedExtensions.length} supported formats</p>
		</div>
	</div>

	{#if !data.canUpload}
		<div class="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3.5 text-sm text-amber-500">
			<Icon name="alert" size={18} class="mt-0.5 shrink-0" />
			<div>
				<p class="font-semibold">Uploads are currently unavailable.</p>
				<p class="mt-0.5 text-amber-500/80">{data.blockedReason ?? 'Uploads are currently unavailable.'}</p>
			</div>
		</div>
	{/if}

	<div class="card-flat mt-8 flex flex-wrap items-center gap-x-7 gap-y-4 px-5 py-4">
		<div class="flex rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-0.5">
			{#each [{ value: 'public', label: 'Public', icon: 'globe' }, { value: 'unlisted', label: 'Unlisted', icon: 'link' }, { value: 'private', label: 'Private', icon: 'lock' }] as option (option.value)}
				<button
					type="button"
					class="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-semibold transition {visibility === option.value
						? 'bg-[rgb(var(--surface))] text-accent shadow-sm'
						: 'text-[rgb(var(--fg-muted))] hover:text-[rgb(var(--fg))]'}"
					onclick={() => (visibility = option.value as Visibility)}
				>
					<Icon name={option.icon} size={13} /> {option.label}
				</button>
			{/each}
		</div>

		<label class="flex cursor-pointer select-none items-center gap-2.5 text-sm">
			<input type="checkbox" bind:checked={compress} class="sr-only" />
			<span class="switch"></span>
			<span class="inline-flex items-center gap-1.5">
				<Icon name="sparkles" size={14} class="text-[rgb(var(--fg-muted))]" />
				Compress images
			</span>
		</label>

		<div class="ml-auto flex flex-1 flex-wrap items-center justify-end gap-2 sm:flex-none">
			<input class="input h-11 w-44 py-2 text-xs" placeholder="tags, comma separated" bind:value={tags} />
			<CollectionPicker class="w-44" bind:value={collectionId} collections={data.collections} placeholder="No collection" />
		</div>
	</div>

	<div
		class="mt-5 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-16 text-center transition {dragging
			? 'border-accent bg-accent/5'
			: 'border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-2))]/60 hover:border-accent/50'}"
		role="button"
		tabindex="0"
		onclick={() => fileInput?.click()}
		onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') fileInput?.click(); }}
		ondragover={(event) => { event.preventDefault(); dragging = true; }}
		ondragleave={() => (dragging = false)}
		ondrop={onDrop}
	>
		<span class="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-fuchsia-500/20 text-accent">
			<Icon name="upload" size={28} />
		</span>
		<p class="text-base font-semibold">{dragging ? 'Release to add files' : 'Drag & drop files here'}</p>
		<p class="mt-1 text-sm text-[rgb(var(--fg-muted))]">or <span class="font-semibold text-accent">browse your device</span></p>
		<p class="mt-3 text-xs text-[rgb(var(--fg-subtle))]">Up to {formatBytes(data.maxUploadSize)} per file · {data.allowedExtensions.slice(0, 10).join(', ')}{data.allowedExtensions.length > 10 ? ' and more' : ''}</p>
		<input
			bind:this={fileInput}
			type="file"
			multiple
			{accept}
			class="hidden"
			onchange={(event) => {
				const input = event.currentTarget as HTMLInputElement;
				if (input.files) addFiles(input.files);
				input.value = '';
			}}
		/>
	</div>

	<p class="mt-2 text-[11px] text-[rgb(var(--fg-subtle))]">
		{#if visibility === 'public'}
			Public files appear in Explore, Fresh from the community and your profile.
		{:else if visibility === 'unlisted'}
			Unlisted files never appear in Explore or Fresh from the community, but still work through direct links and public collection or subfolder links.
		{:else}
			Private files are only accessible to you; create a share link to grant access.
		{/if}
	</p>

	{#if items.length}
		<div class="mt-8 flex flex-wrap items-center gap-2.5">
			<button class="btn-primary" onclick={startUploads} disabled={uploading || pending === 0 || !data.canUpload}>
				{#if uploading}<Icon name="spinner" size={15} class="animate-spin" /> Uploading…{:else}<Icon name="upload" size={15} /> Upload {pending} file{pending === 1 ? '' : 's'}{/if}
			</button>
			{#if done > 0}
				<button class="btn-secondary" onclick={copyAll}><Icon name="copy" size={14} /> Copy all links</button>
			{/if}
			<button class="btn-ghost" onclick={clearFinished} disabled={uploading}>Clear finished</button>
			<span class="ml-auto text-xs text-[rgb(var(--fg-subtle))]">{done}/{items.length} uploaded{failed ? ` · ${failed} failed` : ''}</span>
		</div>

		<ul class="mt-5 space-y-3">
			{#each items as item (item.key)}
				<li class="card-flat overflow-hidden">
					<div class="flex items-center gap-3 p-3">
						<div class="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[rgb(var(--surface-3))]">
							{#if item.preview}
								<img src={item.preview} alt="" class="h-full w-full object-cover" />
							{:else}
								<span class="flex h-full w-full items-center justify-center text-[rgb(var(--fg-subtle))]"><Icon name="folder" size={18} /></span>
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium">{truncate(item.file.name, 46)}</p>
							<div class="mt-0.5 flex items-center gap-2 text-[11px] text-[rgb(var(--fg-subtle))]">
								<span>{formatBytes(item.file.size)}</span>
								{#if item.status === 'uploading'}<span class="text-accent">Uploading… {item.progress}%</span>{/if}
								{#if item.status === 'done'}<span class="text-emerald-400">Uploaded{item.result?.duplicate ? ' · duplicate' : ''}</span>{/if}
								{#if item.status === 'error'}<span class="text-red-400">{item.error}</span>{/if}
							</div>
							{#if item.status === 'uploading'}
								<div class="mt-1.5 h-1 overflow-hidden rounded-full bg-[rgb(var(--surface-3))]">
									<div class="h-full rounded-full bg-gradient-to-r from-accent to-fuchsia-500 transition-all" style="width:{item.progress}%"></div>
								</div>
							{/if}
						</div>

						{#if item.status === 'done' && item.result}
							<div class="flex shrink-0 items-center gap-1">
								<CopyButton text={item.result.absoluteUrl} iconOnly />
								<a href={item.result.url} target="_blank" rel="noreferrer" class="btn-icon" aria-label="Open file">
									<Icon name="external" size={16} />
								</a>
								<a href="/dashboard/images/{item.result.file.id}" class="btn-icon" aria-label="Manage">
									<Icon name="settings" size={16} />
								</a>
							</div>
						{:else}
							<button class="btn-icon" onclick={() => removeItem(item.key)} disabled={uploading && item.status === 'uploading'} aria-label="Remove">
								<Icon name="x" size={16} />
							</button>
						{/if}
					</div>

					{#if item.status === 'done' && item.result}
						<div class="flex flex-wrap items-center gap-2 border-t border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-3 py-2">
							<code class="min-w-0 flex-1 truncate rounded-md bg-[rgb(var(--surface-3))] px-2 py-1 text-[11px]">{item.result.absoluteUrl}</code>
							<CopyButton text={item.result.absoluteUrl} label="URL" />
							<CopyButton text={item.result.markdown} label="MD" />
											{#if item.result.file}
								{#if fileVisibility(item.result.file) === 'private'}
									<span class="text-[10px] text-amber-500">private — owner only</span>
								{:else if fileVisibility(item.result.file) === 'unlisted'}
									<span class="text-[10px] text-sky-400">unlisted — link only</span>
								{/if}
							{/if}
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<div class="mt-10 grid gap-5 sm:grid-cols-3">
			{#each [{ icon: 'link', title: 'Direct URLs', text: 'Clean links that work in Markdown, HTML and BBCode.' }, { icon: 'lock', title: 'Private by default', text: 'New uploads stay out of Explore; flip the switch to publish.' }, { icon: 'film', title: 'GIF ready', text: 'Send your images to the GIF Studio after uploading.' }] as tip (tip.title)}
				<div class="card-flat p-6">
					<span class="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent"><Icon name={tip.icon} size={15} /></span>
					<p class="text-sm font-semibold">{tip.title}</p>
					<p class="mt-0.5 text-xs leading-relaxed text-[rgb(var(--fg-muted))]">{tip.text}</p>
				</div>
			{/each}
		</div>
	{/if}
</div>
