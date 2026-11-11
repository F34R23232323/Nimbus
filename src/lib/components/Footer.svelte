<script lang="ts">
	import type { PublicSettings, SessionUser } from '$lib/types';
	import Icon from './Icon.svelte';

	let {
		site,
		user = null,
		compact = false
	}: { site: PublicSettings; user?: SessionUser | null; compact?: boolean } = $props();
	const year = new Date().getFullYear();
</script>

<footer class="mt-20 border-t border-[rgb(var(--border))]">
	<div class="mx-auto max-w-[1440px] px-5 py-10 sm:px-8">
		<div class="flex flex-col items-center justify-between gap-5 sm:flex-row">
			<div class="flex items-center gap-2 text-sm text-[rgb(var(--fg-muted))]">
				<span class="flex h-7 w-7 items-center justify-center rounded bg-[rgb(var(--fg))] text-[rgb(var(--bg))]">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
						<path d="M5 19V5l14 14V5" />
					</svg>
				</span>
				<span>© {year} {site.siteName}</span>
				{#if !compact}
					<span class="hidden text-[rgb(var(--fg-subtle))] sm:inline">·</span>
					<span class="hidden text-xs text-[rgb(var(--fg-subtle))] sm:inline">Self-hosted media, your rules.</span>
				{/if}
			</div>

			{#if !compact}
				<nav class="flex items-center gap-4 text-xs text-[rgb(var(--fg-subtle))]">
					<a href="/explore" class="hover:text-[rgb(var(--fg))]">Explore</a>
					{#if user}
						<a href="/dashboard/upload" class="hover:text-[rgb(var(--fg))]">Upload</a>
						<a href="/dashboard/gif-studio" class="hover:text-[rgb(var(--fg))]">GIF Studio</a>
						<a href="/dashboard/settings" class="inline-flex items-center gap-1 hover:text-[rgb(var(--fg))]">
							<Icon name="discord" size={13} /> Discord bot
						</a>
					{:else}
						<a href="/login" class="hover:text-[rgb(var(--fg))]">Sign in</a>
					{/if}
				</nav>
			{/if}
		</div>
	</div>
</footer>
