<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import Select from '$lib/components/Select.svelte';
	import SlideOver from '$lib/components/SlideOver.svelte';
	import { confirmSubmit } from '$lib/actions/confirmSubmit';
	import type { SelectOption } from '$lib/types';

	let { data, form }: { data: PageData; form: (ActionData & Record<string, any>) | null } = $props();

	let editingTagId = $state<number | null>(null);
	const editingTag = $derived(data.tags.find((tag) => tag.id === editingTagId) ?? null);
	const parentOptions = $derived<SelectOption[]>([
		{ value: '', label: 'None — top level', icon: 'minus' },
		...data.tags.map((tag) => ({ value: String(tag.id), label: tag.name, icon: 'tag' }))
	]);
</script>

<svelte:head><title>Tags · {data.site.siteName}</title></svelte:head>

<div>
	<h1 class="page-title">Tags</h1>
	<p class="mt-1 text-sm text-[rgb(var(--fg-muted))]">Organise uploads with hierarchical tags. Add tags when uploading or editing a file.</p>
</div>

{#if form?.success}
	<div class="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">{form.success}</div>
{/if}
{#if form?.error}
	<div class="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{form.error}</div>
{/if}

<form method="POST" action="?/create" use:enhance class="card-flat mt-6 grid gap-4 p-5 sm:grid-cols-[1.2fr_1fr_auto_auto] sm:items-end">
	<div>
		<label class="label" for="name">New tag</label>
		<input id="name" name="name" class="input" placeholder="wallpaper" maxlength="40" required />
	</div>
	<div>
		<label class="label" for="parentId">Parent <span class="font-normal normal-case text-[rgb(var(--fg-subtle))]">(optional)</span></label>
		<Select id="parentId" name="parentId" options={parentOptions} placeholder="None — top level" />
	</div>
	<div>
		<label class="label" for="color">Colour</label>
		<input id="color" name="color" type="color" class="h-[42px] w-14 cursor-pointer rounded-xl border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-2))] p-1" value="#6366f1" />
	</div>
	<button class="btn-primary" type="submit"><Icon name="plus" size={14} /> Create</button>
</form>

{#if data.tags.length}
	<div class="card-flat mt-6">
		<ul class="divide-y divide-[rgb(var(--border))]">
			{#each data.tags as tag (tag.id)}
				<li class="group">
					<div class="flex flex-wrap items-center gap-3 px-5 py-4">
						<span class="h-3 w-3 shrink-0 rounded-full" style="background:{tag.color || 'rgb(var(--accent))'}"></span>
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-medium">
								{#if tag.parent_name}<span class="text-[rgb(var(--fg-subtle))]">{tag.parent_name} / </span>{/if}#{tag.name}
							</p>
							<p class="text-[11px] text-[rgb(var(--fg-subtle))]">{tag.file_count} file{tag.file_count === 1 ? '' : 's'} · /explore?tag={tag.slug}</p>
						</div>
						<a href="/explore?tag={encodeURIComponent(tag.slug)}" class="chip hidden sm:inline-flex">View in Explore</a>
						<button class="btn-icon h-8 w-8" onclick={() => (editingTagId = tag.id)} title="Edit tag"><Icon name="edit" size={14} /></button>
						<form method="POST" action="?/delete" use:confirmSubmit={{ title: 'Delete this tag?', message: 'Files stay in your library; only the tag is removed.', confirmLabel: 'Delete tag' }}>
							<input type="hidden" name="id" value={tag.id} />
							<button class="btn-icon h-8 w-8 hover:text-red-400" title="Delete tag" type="submit"><Icon name="trash" size={14} /></button>
						</form>
					</div>
				</li>
			{/each}
		</ul>
	</div>
{:else}
	<div class="mt-5">
		<EmptyState icon="tag" title="No tags yet" description="Create your first tag above, then attach it to uploads for quick filtering." />
	</div>
{/if}

<SlideOver open={editingTagId !== null} onclose={() => (editingTagId = null)} title="Edit tag" description="Rename, recolour or move this tag.">
	{#if editingTag}
		<form
			method="POST"
			action="?/update"
			use:enhance={() =>
				async ({ update, result }) => {
					await update();
					if (result.type === 'success') editingTagId = null;
				}}
			class="space-y-5"
		>
			<input type="hidden" name="id" value={editingTag.id} />
			<div>
				<label class="label" for="editTagName">Name</label>
				<input id="editTagName" name="name" class="input" value={editingTag.name} maxlength="40" required />
			</div>
			<div>
				<label class="label" for="editTagParent">Parent</label>
				<Select
					id="editTagParent"
					name="parentId"
					value={editingTag.parent_id ? String(editingTag.parent_id) : ''}
					options={[
						{ value: '', label: 'No parent', icon: 'minus' },
						...data.tags
							.filter((entry) => entry.id !== editingTag.id)
							.map((entry) => ({ value: String(entry.id), label: entry.name, icon: 'tag' }))
					]}
				/>
			</div>
			<div>
				<label class="label" for="editTagColor">Colour</label>
				<input id="editTagColor" name="color" type="color" class="h-12 w-full cursor-pointer rounded-xl border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-2))] p-1.5" value={editingTag.color || '#6366f1'} />
			</div>
			<div class="flex gap-2">
				<button class="btn-secondary flex-1" type="button" onclick={() => (editingTagId = null)}>Cancel</button>
				<button class="btn-primary flex-1" type="submit"><Icon name="check" size={14} /> Save tag</button>
			</div>
		</form>
	{/if}
</SlideOver>
