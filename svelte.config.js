import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({ out: 'build' }),
		// Origin validation is handled in hooks.server.ts so that API-key and
		// bot requests can talk to the instance without a browser Origin header.
		csrf: { checkOrigin: false }
	}
};

export default config;
