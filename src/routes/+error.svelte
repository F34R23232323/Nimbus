<script lang="ts">
	import { page } from '$app/stores';
	import Icon from '$lib/components/Icon.svelte';

	const status = $derived($page.status);
	const title = $derived(
		status === 404
			? 'Page not found'
			: status === 403
				? 'Access denied'
				: status === 401
					? 'Sign in required'
					: 'Something went wrong'
	);
</script>

<svelte:head><title>{title} · Nimbus</title></svelte:head>

<div class="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
	<div class="relative mb-6">
		<div class="absolute inset-0 animate-pulse-soft rounded-full bg-accent/25 blur-2xl"></div>
		<span class="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] text-accent">
			<Icon name={status === 404 ? 'search' : 'alert'} size={34} />
		</span>
	</div>
	<p class="text-sm font-bold uppercase tracking-[0.2em] text-accent">{status}</p>
	<h1 class="mt-2 page-title">{title}</h1>
	<p class="mt-2 text-sm text-[rgb(var(--fg-muted))]">
		{$page.error?.message ?? 'The requested resource is unavailable.'}
	</p>
	<div class="mt-7 flex gap-2">
		<a href="/" class="btn-secondary"><Icon name="home" size={15} /> Home</a>
		<a href="/explore" class="btn-primary"><Icon name="globe" size={15} /> Explore</a>
	</div>
</div>
