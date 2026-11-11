<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import Icon from '$lib/components/Icon.svelte';

	let { data, form }: { data: PageData; form: (ActionData & Record<string, any>) | null } = $props();
</script>

<svelte:head><title>Sign in · {data.site.siteName}</title></svelte:head>

<div class="auth-layout mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-5 py-14 lg:grid-cols-2 lg:gap-24">
	<div class="auth-story relative hidden overflow-hidden rounded-[2rem] border border-[rgb(var(--border))] p-12 lg:block">
		<div class="absolute -right-16 -top-16 h-64 w-64 animate-blob rounded-full bg-accent/25 blur-3xl"></div>
		<div class="absolute -bottom-20 -left-10 h-64 w-64 animate-blob rounded-full bg-accent/10 blur-3xl"></div>
		<div class="relative">
			<span class="badge badge-accent"><Icon name="sparkles" size={12} /> Welcome back</span>
			<h1 class="mt-8 text-5xl font-bold leading-tight tracking-tight">
				Your media,<br /><span class="gradient-text">under your control.</span>
			</h1>
			<p class="mt-4 max-w-sm text-sm leading-relaxed text-[rgb(var(--fg-muted))]">
				Sign in to manage uploads, build collections, generate GIFs and create private, expiring share links.
			</p>
			<ul class="mt-8 space-y-3.5 text-sm text-[rgb(var(--fg-muted))]">
				<li class="flex items-center gap-2.5"><span class="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent"><Icon name="lock" size={14} /></span> Private-by-default shares with passwords</li>
				<li class="flex items-center gap-2.5"><span class="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent"><Icon name="film" size={14} /></span> Turn stills and GIFs into animated loops</li>
				<li class="flex items-center gap-2.5"><span class="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent"><Icon name="discord" size={14} /></span> Upload straight from Discord</li>
			</ul>
		</div>
	</div>

	<div class="auth-form mx-auto w-full max-w-md">
		<div class="mb-8 flex items-center gap-3 lg:hidden">
			<span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-white">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19V5l14 14V5" /></svg>
			</span>
			<span class="text-lg font-bold">{data.site.siteName}</span>
		</div>

		<h2 class="page-title">Sign in to your account</h2>
		<p class="mt-1 text-sm text-[rgb(var(--fg-muted))]">Use your email and password to continue.</p>

		{#if form?.error}
			<div class="mt-5 flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-3 text-sm text-red-400">
				<Icon name="alert" size={16} class="mt-0.5 shrink-0" />
				<span>{form.error}</span>
			</div>
		{/if}

		<form method="POST" class="mt-9 space-y-5">
			<input type="hidden" name="next" value={data.next} />
			<div>
				<label class="label" for="email">Email</label>
				<input id="email" name="email" type="email" class="input" placeholder="you@example.com" value={form?.email ?? ''} autocomplete="email" required />
			</div>
			<div>
				<div class="flex items-center justify-between">
					<label class="label" for="password">Password</label>
					<span class="mb-1.5 text-xs text-[rgb(var(--fg-subtle))]">8+ characters</span>
				</div>
				<input id="password" name="password" type="password" class="input" placeholder="••••••••" autocomplete="current-password" required />
			</div>
			<button class="btn-primary w-full" type="submit">Sign in <Icon name="arrowRight" size={15} /></button>
		</form>

		<p class="mt-6 text-center text-sm text-[rgb(var(--fg-muted))]">
			{#if data.registrationEnabled}
				New here? <a href="/register" class="font-semibold text-accent hover:underline">Create an account</a>
			{:else}
				Registration is currently closed.
			{/if}
		</p>
	</div>
</div>
