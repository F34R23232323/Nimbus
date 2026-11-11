<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import ToastHost from '$lib/components/ToastHost.svelte';
	import ConfirmHost from '$lib/components/ConfirmHost.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { applyAccent, hydrateUiPrefs } from '$lib/stores/ui';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	onMount(() => {
		hydrateUiPrefs();
		try {
			const storedAccent = localStorage.getItem('nimbus:accent');
			if ((!storedAccent || storedAccent.toLowerCase() === '#6366f1') && data.site.accent)
				applyAccent(data.site.accent);
		} catch {
			// ignore
		}
	});

	const isDashboard = $derived($page.url.pathname.startsWith('/dashboard'));
</script>

<svelte:head>
	<meta name="description" content={data.site.siteDescription} />
</svelte:head>

<div class="flex min-h-screen flex-col">
	<Header user={data.user} site={data.site} unread={data.unread} />

	{#if data.site.maintenance && data.user?.role !== 'admin'}
		<div class="border-b border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-center text-xs font-medium text-amber-500">
			<span class="inline-flex items-center gap-1.5">
				<Icon name="alert" size={14} />
				{data.site.siteName} is in maintenance mode. Some features may be temporarily unavailable.
			</span>
		</div>
	{/if}

	<main class="flex-1">
		{@render children()}
	</main>

	<Footer site={data.site} user={data.user} compact={isDashboard} />
</div>

<ToastHost />
<ConfirmHost />
