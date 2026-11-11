<script lang="ts">
	import type { PageData } from './$types';
	import Icon from '$lib/components/Icon.svelte';
	import CopyButton from '$lib/components/CopyButton.svelte';
	import Select from '$lib/components/Select.svelte';
	import { toast } from '$lib/stores/ui';
	import { formatBytes } from '$lib/utils/format';
	import type { SelectOption, Visibility } from '$lib/types';

	let { data }: { data: PageData } = $props();

	interface Frame {
		key: string;
		file: File;
		url: string;
	}

	interface GifResult {
		ok: boolean;
		file: { id: string; original_name: string; size: number; width: number | null; height: number | null; pages: number };
		url: string;
		absoluteUrl: string;
		thumbUrl: string | null;
		error?: string;
	}

	const effects: SelectOption[] = [
		{ value: 'none', label: 'None — keep still' },
		{ value: 'zoom-in', label: 'Zoom in' },
		{ value: 'zoom-out', label: 'Zoom out' },
		{ value: 'pulse', label: 'Pulse' },
		{ value: 'pan-left', label: 'Pan left' },
		{ value: 'pan-right', label: 'Pan right' },
		{ value: 'shake', label: 'Shake' },
		{ value: 'bounce', label: 'Bounce' },
		{ value: 'rotate', label: 'Wobble' },
		{ value: 'fade-in', label: 'Fade in' }
	];

	const visibilityOptions: SelectOption[] = [
		{ value: 'public', label: 'Public — listed in Explore', icon: 'globe' },
		{ value: 'unlisted', label: 'Unlisted — links & folders only', icon: 'link' },
		{ value: 'private', label: 'Private — only you', icon: 'lock' }
	];
	const transitionOptions: SelectOption[] = [
		{ value: 'fade', label: 'Crossfade', icon: 'sparkles' },
		{ value: 'none', label: 'Hard cut', icon: 'film' }
	];
	const fitOptions: SelectOption[] = [
		{ value: 'contain', label: 'Contain (letterbox)', icon: 'image' },
		{ value: 'cover', label: 'Cover (crop)', icon: 'images' }
	];

	let frames = $state<Frame[]>([]);
	let dragging = $state(false);
	let generating = $state(false);
	let result = $state<GifResult | null>(null);
	let fileInput: HTMLInputElement | undefined = $state();
	let sharing = $state(false);

	let effect = $state('none');
	let transition = $state<'fade' | 'none'>('fade');
	let width = $state(480);
	let delay = $state(80);
	let loop = $state(true);
	let colors = $state(256);
	let fit = $state<'contain' | 'cover'>('contain');
	let background = $state('#0a0c16');
	let name = $state('');
	let visibility = $state<Visibility>(data.defaultVisibility);
	let tags = $state('');

	const frameCount = $derived(frames.length);
	const useEffect = $derived(frameCount === 1);

	function addFiles(list: FileList | File[]) {
		const incoming = Array.from(list).filter((file) => file.type.startsWith('image/'));
		if (!incoming.length) {
			toast('Add image files (PNG, JPG, WEBP, GIF…)', 'error');
			return;
		}
		if (frames.length + incoming.length > 24) {
			toast('Up to 24 images per GIF', 'error');
			return;
		}
		for (const file of incoming) {
			if (file.size > data.maxUploadSize) {
				toast(`${file.name} is too large`, 'error');
				continue;
			}
			frames = [...frames, { key: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file, url: URL.createObjectURL(file) }];
		}
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;
		if (event.dataTransfer?.files) addFiles(event.dataTransfer.files);
	}

	function removeFrame(key: string) {
		const frame = frames.find((item) => item.key === key);
		if (frame) URL.revokeObjectURL(frame.url);
		frames = frames.filter((item) => item.key !== key);
	}

	function move(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= frames.length) return;
		const copy = [...frames];
		[copy[index], copy[target]] = [copy[target], copy[index]];
		frames = copy;
	}

	function applyPreset(preset: 'cinematic' | 'slideshow' | 'bounce') {
		if (preset === 'cinematic') {
			effect = 'zoom-in';
			width = 640;
			delay = 70;
			colors = 256;
			fit = 'cover';
		} else if (preset === 'slideshow') {
			transition = 'fade';
			width = 480;
			delay = 90;
			fit = 'contain';
		} else {
			effect = 'bounce';
			width = 480;
			delay = 60;
			fit = 'contain';
		}
		toast('Preset applied', 'success');
	}

	async function generate() {
		if (!frames.length || generating) return;
		generating = true;
		result = null;
		try {
			const form = new FormData();
			for (const frame of frames) form.append('frames', frame.file);
			form.append('effect', useEffect ? effect : 'none');
			form.append('transition', transition);
			form.append('width', String(width));
			form.append('delay', String(delay));
			form.append('loop', loop ? '1' : '0');
			form.append('colors', String(colors));
			form.append('fit', fit);
			form.append('background', background);
			form.append('hold', '10');
			form.append('visibility', visibility);
			if (name.trim()) form.append('name', name.trim());
			if (tags.trim()) form.append('tags', tags.trim());

			const response = await fetch('/api/gif', { method: 'POST', body: form });
			const json = (await response.json()) as GifResult;
			if (!response.ok || !json.ok) {
				toast(json.error ?? 'GIF generation failed', 'error');
				return;
			}
			result = json;
			toast('GIF created', 'success', `${json.file.pages ?? 0} frames · ${formatBytes(json.file.size)}`);
		} catch {
			toast('GIF generation failed', 'error', 'Check your connection and try again.');
		} finally {
			generating = false;
		}
	}

	async function createShare() {
		if (!result || sharing) return;
		sharing = true;
		try {
			const response = await fetch('/api/shares', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ fileId: result.file.id })
			});
			const json = (await response.json()) as { url?: string; error?: string };
			if (!response.ok || !json.url) {
				toast(json.error ?? 'Could not create share', 'error');
				return;
			}
			await navigator.clipboard.writeText(json.url).catch(() => undefined);
			toast('Share link copied', 'success', json.url);
		} finally {
			sharing = false;
		}
	}
</script>

<svelte:head><title>GIF Studio · {data.site.siteName}</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-5">
	<div>
		<span class="badge badge-accent"><Icon name="film" size={12} /> GIF Studio</span>
		<h1 class="mt-3 page-title">Turn images into motion</h1>
		<p class="mt-1 max-w-xl text-sm text-[rgb(var(--fg-muted))]">
			Add one image for an animated effect, or several for a slideshow. Everything is encoded on your own server.
		</p>
	</div>
	<div class="flex gap-2">
		<button class="chip" onclick={() => applyPreset('cinematic')}>Cinematic zoom</button>
		<button class="chip" onclick={() => applyPreset('slideshow')}>Slideshow</button>
		<button class="chip" onclick={() => applyPreset('bounce')}>Bounce</button>
	</div>
</div>

{#if !data.canUpload}
	<div class="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-500">
		<Icon name="alert" size={17} class="mt-0.5 shrink-0" />
		<p>{data.blockedReason ?? 'Sign in to use the GIF studio.'}</p>
	</div>
{/if}

{#if result}
	<div class="card-flat mt-6 overflow-hidden border-accent/30">
		<div class="flex items-center justify-between border-b border-[rgb(var(--border))] px-4 py-3">
			<div class="flex items-center gap-2 text-sm font-semibold text-emerald-400"><Icon name="check" size={16} /> GIF generated</div>
			<span class="badge">{formatBytes(result.file.size)}</span>
		</div>
		<div class="grid items-center gap-6 p-5 sm:grid-cols-[minmax(0,280px)_1fr]">
			<div class="flex items-center justify-center rounded-xl bg-[#06070b] p-2">
				<img src={result.url} alt="Generated GIF" class="max-h-60 w-auto max-w-full rounded-lg" />
			</div>
			<div class="min-w-0 space-y-3">
				<code class="block truncate rounded-lg bg-[rgb(var(--surface-2))] px-3 py-2 text-[11px]">{result.absoluteUrl}</code>
				<div class="flex flex-wrap gap-2">
					<CopyButton text={result.absoluteUrl} label="Copy URL" />
					<CopyButton text={`![${result.file.original_name}](${result.absoluteUrl})`} label="Markdown" />
					<a href="{result.url}?download=1" class="btn-primary btn-sm"><Icon name="download" size={14} /> Download</a>
					{#if data.user}
						<button class="btn-secondary btn-sm" onclick={createShare} disabled={sharing}>
							<Icon name="link" size={14} /> {sharing ? 'Creating…' : 'Share link'}
						</button>
					{/if}
					<a href="/dashboard/images/{result.file.id}" class="btn-ghost btn-sm"><Icon name="settings" size={14} /> Manage</a>
				</div>
				<p class="text-[11px] text-[rgb(var(--fg-subtle))]">Saved as {result.file.original_name}{result.file.pages ? ` · ${result.file.pages} frames` : ''}{result.file.width ? ` · ${result.file.width}×${result.file.height}` : ''}</p>
			</div>
		</div>
	</div>
{/if}

<div class="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
	<div class="space-y-6">
		<div
			class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition {dragging
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
			<span class="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent"><Icon name="image" size={22} /></span>
			<p class="text-sm font-semibold">{dragging ? 'Release to add frames' : 'Drop images here'}</p>
			<p class="mt-1 text-xs text-[rgb(var(--fg-muted))]">or click to browse · up to 24 images · max {formatBytes(data.maxUploadSize)} each</p>
			<input
				bind:this={fileInput}
				type="file"
				multiple
				accept="image/*"
				class="hidden"
				onchange={(event) => {
					const input = event.currentTarget as HTMLInputElement;
					if (input.files) addFiles(input.files);
					input.value = '';
				}}
			/>
		</div>

		{#if frames.length}
			<div class="card-flat p-4">
				<div class="mb-2 flex items-center justify-between px-1">
					<p class="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--fg-subtle))]">Frames ({frames.length})</p>
					<button class="text-[11px] text-[rgb(var(--fg-subtle))] hover:text-red-400" onclick={() => { frames.forEach((frame) => URL.revokeObjectURL(frame.url)); frames = []; }}>Clear all</button>
				</div>
				<ul class="space-y-1.5">
					{#each frames as frame, index (frame.key)}
						<li class="flex items-center gap-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] p-1.5">
							<span class="w-5 text-center text-[11px] font-semibold text-[rgb(var(--fg-subtle))]">{index + 1}</span>
							<img src={frame.url} alt="" class="h-10 w-10 rounded-md object-cover" />
							<div class="min-w-0 flex-1">
								<p class="truncate text-xs font-medium">{frame.file.name}</p>
								<p class="text-[10px] text-[rgb(var(--fg-subtle))]">{formatBytes(frame.file.size)}</p>
							</div>
							<button class="btn-icon h-7 w-7" onclick={() => move(index, -1)} disabled={index === 0} aria-label="Move up"><Icon name="chevronLeft" size={13} /></button>
							<button class="btn-icon h-7 w-7" onclick={() => move(index, 1)} disabled={index === frames.length - 1} aria-label="Move down"><Icon name="chevronRight" size={13} /></button>
							<button class="btn-icon h-7 w-7 hover:text-red-400" onclick={() => removeFrame(frame.key)} aria-label="Remove"><Icon name="x" size={13} /></button>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="card-flat p-6">
			<h2 class="text-sm font-semibold">Output</h2>
			<div class="mt-3 grid gap-3 sm:grid-cols-2">
				<div>
					<label class="label" for="name">File name</label>
					<input id="name" class="input" bind:value={name} placeholder="my-animation.gif" />
				</div>
				<div>
					<label class="label" for="tags">Tags <span class="font-normal normal-case text-[rgb(var(--fg-subtle))]">(optional)</span></label>
					<input id="tags" class="input" bind:value={tags} placeholder="loop, art" disabled={!data.user} />
				</div>
			</div>
			<div class="mt-3">
				<label class="label" for="visibility">Visibility</label>
				<Select id="visibility" bind:value={visibility} options={visibilityOptions} />
				<p class="hint">
					{#if visibility === 'public'}
						Listed in Explore, Fresh from the community and your profile.
					{:else if visibility === 'unlisted'}
						Direct links and public collection links work, but it is hidden from Explore and Fresh from the community.
					{:else}
						Only you can access it; create a share link to grant access.
					{/if}
				</p>
			</div>
		</div>
	</div>

	<aside class="card-flat p-6 lg:sticky lg:top-20">
		<h2 class="text-sm font-semibold">Animation settings</h2>

		{#if useEffect}
			<div class="mt-3">
				<label class="label" for="effect">Effect</label>
				<Select id="effect" bind:value={effect} options={effects} searchable />
				<p class="hint">Applied to your single frame. With multiple images a slideshow is built instead.</p>
			</div>
		{:else}
			<div class="mt-3">
				<label class="label" for="transition">Transition</label>
				<Select id="transition" bind:value={transition} options={transitionOptions} />
				<p class="hint">Each image holds for about 10 frames, then fades into the next.</p>
			</div>
		{/if}

		<div class="mt-4 grid grid-cols-2 gap-3">
			<div>
				<label class="label" for="width">Width</label>
				<input id="width" type="number" min="64" max="1024" class="input" bind:value={width} />
			</div>
			<div>
				<label class="label" for="delay">Frame delay</label>
				<input id="delay" type="number" min="20" max="1000" step="10" class="input" bind:value={delay} />
			</div>
		</div>

		<div class="mt-3">
			<label class="label" for="colors">Colours <span class="font-normal normal-case text-[rgb(var(--fg-subtle))]">({colors})</span></label>
			<input id="colors" type="range" min="16" max="256" step="16" bind:value={colors} class="w-full accent-[rgb(var(--accent))]" />
		</div>

		<div class="mt-3 grid grid-cols-2 gap-3">
			<div>
				<label class="label" for="fit">Fit</label>
				<Select id="fit" bind:value={fit} options={fitOptions} />
			</div>
			<div>
				<label class="label" for="background">Background</label>
				<input id="background" type="color" class="h-[42px] w-full cursor-pointer rounded-xl border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-2))] p-1" bind:value={background} />
			</div>
		</div>

		<label class="mt-4 flex cursor-pointer items-center justify-between gap-5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface-2))] px-4 py-2.5">
			<span class="text-sm">Loop forever</span>
			<input type="checkbox" bind:checked={loop} class="sr-only" />
			<span class="switch"></span>
		</label>

		<button class="btn-primary mt-4 w-full" onclick={generate} disabled={!frames.length || generating || !data.canUpload}>
			{#if generating}<Icon name="spinner" size={15} class="animate-spin" /> Encoding…{:else}<Icon name="sparkles" size={15} /> Generate GIF{/if}
		</button>
		<p class="mt-2 text-center text-[10px] leading-relaxed text-[rgb(var(--fg-subtle))]">
			{frameCount === 0 ? 'Add at least one image to begin.' : frameCount === 1 ? 'One image → animated loop.' : `${frameCount} images → slideshow.`}
			Generated GIFs are saved to your library.
		</p>
	</aside>
</div>
