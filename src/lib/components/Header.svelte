<script lang="ts">
	import { page } from '$app/stores';
	import type { PublicSettings, SessionUser } from '$lib/types';
	import Icon from './Icon.svelte';
	import Avatar from './Avatar.svelte';
	import { toggleTheme, theme } from '$lib/stores/ui';

	let {
		user = null,
		site,
		unread = 0
	}: { user: SessionUser | null; site: PublicSettings; unread?: number } = $props();

	let mobileOpen = $state(false);
	let userMenuOpen = $state(false);

	const links = $derived([
		{ href: '/explore', label: 'Explore', icon: 'globe' },
		...(user
			? [
					{ href: '/dashboard', label: 'Workspace', icon: 'grid' },
					{ href: '/dashboard/gif-studio', label: 'GIF Studio', icon: 'film' }
				]
			: [])
	]);

	function isActive(href: string): boolean {
		if (href === '/explore') return $page.url.pathname.startsWith('/explore') || $page.url.pathname === '/';
		return $page.url.pathname.startsWith(href);
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') userMenuOpen = false;
	}
</script>

<svelte:window onkeydown={onkeydown} />

<header class="site-header sticky top-0 z-50">
	<div class="site-header-inner mx-auto flex items-center gap-4">
		<a href="/" class="flex items-center gap-3 font-semibold" aria-label={`${site.siteName} home`}>
			<img src="/nimbus-mark-dark.svg" alt="" width="40" height="40" class="h-10 w-10 transition-transform duration-300 hover:-rotate-6" />
			<span class="brand-name hidden text-lg font-semibold tracking-tight sm:block">{site.siteName}<span class="text-accent">.</span></span>
		</a>

		<nav class="site-main-nav ml-8 hidden items-center gap-1 md:flex" aria-label="Main navigation">
			{#each links as link (link.href)}
				<a
					href={link.href}
					class="nav-link inline-flex items-center gap-1.5 {isActive(link.href) ? 'nav-link-active' : ''}"
				>
					<Icon name={link.icon} size={15} />
					{link.label}
				</a>
			{/each}
		</nav>

		<div class="ml-auto flex items-center gap-2 sm:gap-3">
			<a href="/explore?focus=search" class="btn-icon hidden sm:inline-flex" aria-label="Search images">
				<Icon name="search" size={18} />
			</a>

			<button class="btn-icon" onclick={toggleTheme} aria-label="Toggle color theme">
				<Icon name={$theme === 'dark' ? 'sun' : 'moon'} size={18} />
			</button>

			{#if user}
				<a href="/dashboard/notifications" class="btn-icon relative" aria-label="Notifications">
					<Icon name="bell" size={18} />
					{#if unread > 0}
						<span class="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
							{unread > 9 ? '9+' : unread}
						</span>
					{/if}
				</a>
				<a href="/dashboard/upload" class="btn-primary hidden sm:inline-flex">
					<Icon name="upload" size={16} /> New upload
				</a>
				<div class="relative">
					<button
						type="button"
						class="account-trigger flex items-center gap-2 rounded-full p-1 pr-2 transition"
						onclick={() => (userMenuOpen = !userMenuOpen)}
						aria-haspopup="menu"
						aria-expanded={userMenuOpen}
					>
						<Avatar name={user.username} src={user.avatar_url} size={32} />
						<Icon name="chevronDown" size={14} class="hidden text-[rgb(var(--fg-subtle))] transition sm:block {userMenuOpen ? 'rotate-180' : ''}" />
					</button>
					{#if userMenuOpen}
						<button class="fixed inset-0 z-[60] cursor-default" aria-label="Close menu" onclick={() => (userMenuOpen = false)}></button>
						<div class="absolute right-0 z-[61] mt-3 w-64 overflow-hidden rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-2 shadow-2xl animate-fade-up" role="menu">
							<div class="px-3 py-2.5">
								<p class="truncate text-sm font-semibold">@{user.username}</p>
								<p class="truncate text-xs text-[rgb(var(--fg-subtle))]">{user.email}</p>
							</div>
							<div class="my-1 h-px bg-[rgb(var(--border))]"></div>
							<a href="/dashboard" onclick={() => (userMenuOpen = false)} class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm hover:bg-[rgb(var(--surface-2))]">
								<Icon name="grid" size={15} /> Dashboard
							</a>
							<a href="/dashboard/images" onclick={() => (userMenuOpen = false)} class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm hover:bg-[rgb(var(--surface-2))]">
								<Icon name="images" size={15} /> My images
							</a>
							<a href="/dashboard/settings" onclick={() => (userMenuOpen = false)} class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm hover:bg-[rgb(var(--surface-2))]">
								<Icon name="settings" size={15} /> Settings
							</a>
							{#if user.role === 'admin'}
								<a href="/dashboard/admin" onclick={() => (userMenuOpen = false)} class="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm hover:bg-[rgb(var(--surface-2))]">
									<Icon name="shield" size={15} /> Admin
								</a>
							{/if}
							<div class="my-1 h-px bg-[rgb(var(--border))]"></div>
							<form method="POST" action="/logout">
								<button class="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10">
									<Icon name="logout" size={15} /> Sign out
								</button>
							</form>
						</div>
					{/if}
				</div>
			{:else}
				<a href="/login" class="btn-ghost btn-sm hidden sm:inline-flex">Sign in</a>
				<a href="/register" class="btn-primary btn-sm">Create account</a>
			{/if}

			<button
				class="btn-icon md:hidden"
				onclick={() => (mobileOpen = !mobileOpen)}
				aria-label="Open navigation"
				aria-expanded={mobileOpen}
			>
				<Icon name={mobileOpen ? 'x' : 'menu'} size={19} />
			</button>
		</div>
	</div>

	{#if mobileOpen}
		<div class="border-t border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-5 py-4 md:hidden">
			<nav class="flex flex-col gap-1.5">
				{#each links as link (link.href)}
					<a href={link.href} class="sidebar-link {isActive(link.href) ? 'active' : ''}" onclick={() => (mobileOpen = false)}>
						<Icon name={link.icon} size={16} /> {link.label}
					</a>
				{/each}
				{#if user}
					<a href="/dashboard/upload" class="sidebar-link" onclick={() => (mobileOpen = false)}>
						<Icon name="upload" size={16} /> New upload
					</a>
					<a href="/dashboard/notifications" class="sidebar-link" onclick={() => (mobileOpen = false)}>
						<Icon name="bell" size={16} /> Notifications {unread > 0 ? `(${unread})` : ''}
					</a>
				{:else}
					<a href="/login" class="sidebar-link" onclick={() => (mobileOpen = false)}>
						<Icon name="login" size={16} /> Sign in
					</a>
				{/if}
			</nav>
		</div>
	{/if}
</header>
