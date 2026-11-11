<script lang="ts">
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const groups = $derived([
		{
			label: 'Library',
			items: [
				{ href: '/dashboard', label: 'Overview', icon: 'home', exact: true },
				{ href: '/dashboard/images', label: 'My images', icon: 'images', exact: false },
				{ href: '/dashboard/collections', label: 'Collections', icon: 'folder', exact: false },
				{ href: '/dashboard/tags', label: 'Tags', icon: 'tag', exact: false },
				{ href: '/dashboard/bookmarks', label: 'Bookmarks', icon: 'bookmark', exact: false },
				{ href: '/dashboard/links', label: 'Short links', icon: 'link', exact: false }
			]
		},
		{
			label: 'Create',
			items: [
				{ href: '/dashboard/upload', label: 'Upload', icon: 'upload', exact: false },
				{ href: '/dashboard/gif-studio', label: 'GIF Studio', icon: 'film', exact: false }
			]
		},
		{
			label: 'Manage',
			items: [
				{ href: '/dashboard/notifications', label: 'Notifications', icon: 'bell', exact: false },
				{ href: '/dashboard/settings', label: 'Settings', icon: 'settings', exact: false },
				...(data.user.role === 'admin'
					? [{ href: '/dashboard/admin', label: 'Administration', icon: 'shield', exact: false }]
					: [])
			]
		}
	]);

	function isActive(href: string, exact = false) {
		return exact ? $page.url.pathname === href : $page.url.pathname.startsWith(href);
	}

	const currentItem = $derived(groups.flatMap((group) => group.items).find((item) => isActive(item.href, item.exact)));
</script>

<div class="workspace-shell">
	<div class="workspace-top">
		<div class="workspace-top-copy">
			<p class="workspace-kicker"><span></span> NIMBUS / WORKSPACE</p>
			<h1 class="workspace-top-title">Your space to create.</h1>
			<p>Move between your library, creative tools, and account in one place.</p>
		</div>
		<div class="workspace-top-actions">
			<a href="/u/{data.user.username}" class="workspace-profile-link">
				<Avatar name={data.user.username} src={data.user.avatar_url} size={36} />
				<span>@{data.user.username}</span>
				<Icon name="arrowUpRight" size={14} />
			</a>
			<a href="/dashboard/upload" class="btn-primary"><Icon name="upload" size={16} /> New upload</a>
		</div>
	</div>

	<nav class="workspace-nav-bar" aria-label="Workspace navigation">
		{#each groups as group (group.label)}
			<div class="workspace-nav-group">
				<p>{group.label}</p>
				<div class="workspace-nav-items">
					{#each group.items as item (item.href)}
						<a href={item.href} aria-current={isActive(item.href, item.exact) ? 'page' : undefined} class:active={isActive(item.href, item.exact)}>
							<Icon name={item.icon} size={16} />
							<span>{item.label}</span>
							{#if item.href === '/dashboard/notifications' && data.unread > 0}
								<span class="workspace-notice">{data.unread}</span>
							{/if}
						</a>
					{/each}
				</div>
			</div>
		{/each}
	</nav>

	<details class="workspace-mobile-menu">
		<summary><Icon name="menu" size={18} /><span>{currentItem?.label ?? 'Browse workspace'}</span><Icon name="chevronDown" size={16} /></summary>
		<nav aria-label="Workspace navigation">
			{#each groups as group (group.label)}
				<div class="workspace-mobile-group">
					<p>{group.label}</p>
					{#each group.items as item (item.href)}
						<a href={item.href} class:active={isActive(item.href, item.exact)} aria-current={isActive(item.href, item.exact) ? 'page' : undefined}>
							<Icon name={item.icon} size={16} /> {item.label}
							{#if item.href === '/dashboard/notifications' && data.unread > 0}
								<span class="workspace-notice">{data.unread}</span>
							{/if}
						</a>
					{/each}
				</div>
			{/each}
		</nav>
	</details>

	<div class="workspace-content">
		{@render children()}
	</div>
</div>