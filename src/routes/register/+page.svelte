<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import Icon from '$lib/components/Icon.svelte';

	let { data, form }: { data: PageData; form: (ActionData & Record<string, any>) | null } = $props();
</script>

<svelte:head><title>Create account · {data.site.siteName}</title></svelte:head>

<div class="auth-layout mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-5 py-14 lg:grid-cols-2 lg:gap-24">
	<div class="auth-story relative hidden overflow-hidden rounded-[2rem] border border-[rgb(var(--border))] p-12 lg:block">
		<div class="absolute -bottom-16 -right-10 h-64 w-64 animate-blob rounded-full bg-accent/10 blur-3xl"></div>
		<div class="absolute -left-16 top-0 h-64 w-64 animate-blob rounded-full bg-accent/25 blur-3xl"></div>
		<div class="relative">
			<span class="badge badge-accent"><Icon name="sparkles" size={12} /> Join the instance</span>
			<h1 class="mt-8 text-5xl font-bold leading-tight tracking-tight">
				A quieter place<br /><span class="gradient-text">to share your media.</span>
			</h1>
			<p class="mt-4 max-w-sm text-sm leading-relaxed text-[rgb(var(--fg-muted))]">
				Keep every screenshot, artwork and file in one polished library. Share exactly what you want, with who you want.
			</p>
			<div class="mt-8 grid grid-cols-2 gap-3">
				{#each [{ icon: 'upload', title: 'Multi-upload', text: 'Parallel uploads with progress' }, { icon: 'folder', title: 'Collections', text: 'Group media into albums' }, { icon: 'tag', title: 'Nested tags', text: 'Organise without folders' }, { icon: 'key', title: 'API keys', text: 'Automate anything' }] as feature (feature.title)}
					<div class="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]/70 p-3.5 backdrop-blur">
						<span class="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent"><Icon name={feature.icon} size={15} /></span>
						<p class="text-sm font-semibold">{feature.title}</p>
						<p class="mt-0.5 text-[11px] leading-snug text-[rgb(var(--fg-subtle))]">{feature.text}</p>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<div class="auth-form mx-auto w-full max-w-md">
		<h2 class="page-title">Create your account</h2>
		<p class="mt-1 text-sm text-[rgb(var(--fg-muted))]">It takes less than a minute.</p>

		{#if !data.registrationEnabled}
			<div class="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-4 text-sm text-amber-500">
				Registration is currently closed on this instance. Ask an administrator for an invite.
			</div>
		{:else}
			{#if form?.error}
				<div class="mt-5 flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-3 text-sm text-red-400">
					<Icon name="alert" size={16} class="mt-0.5 shrink-0" />
					<span>{form.error}</span>
				</div>
			{/if}

			<form method="POST" class="mt-9 space-y-5">
				<div>
					<label class="label" for="username">Username</label>
					<input id="username" name="username" class="input" placeholder="pixel_pilot" value={form?.username ?? ''} autocomplete="username" required />
					<p class="hint">Letters, numbers and underscores. Your profile lives at /u/yourname.</p>
				</div>
				<div>
					<label class="label" for="email">Email</label>
					<input id="email" name="email" type="email" class="input" placeholder="you@example.com" value={form?.email ?? ''} autocomplete="email" required />
				</div>
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<label class="label" for="password">Password</label>
						<input id="password" name="password" type="password" class="input" placeholder="8+ characters" autocomplete="new-password" required />
					</div>
					<div>
						<label class="label" for="confirm">Confirm</label>
						<input id="confirm" name="confirm" type="password" class="input" placeholder="Repeat password" autocomplete="new-password" required />
					</div>
				</div>
				<button class="btn-primary w-full" type="submit">Create account <Icon name="arrowRight" size={15} /></button>
			</form>
		{/if}

		<p class="mt-6 text-center text-sm text-[rgb(var(--fg-muted))]">
			Already have an account? <a href="/login" class="font-semibold text-accent hover:underline">Sign in</a>
		</p>
	</div>
</div>
