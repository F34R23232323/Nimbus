import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const root = process.cwd();
const webEntry = resolve(root, 'build/index.js');
const botEntry = resolve(root, 'bot/index.ts');
const node = process.execPath;

if (!existsSync(webEntry)) {
	console.error('[nimbus] build/index.js not found.');
	console.error('[nimbus] Run "npm run build" before "npm run start".');
	process.exit(1);
}

let web = null;
let bot = null;
let webExitCode = null;
let shuttingDown = false;
let restartTimer = null;
let stableTimer = null;
let botBackoff = 5_000;

function terminate(child) {
	if (!child || child.exitCode !== null || child.killed) return;
	try {
		child.kill('SIGTERM');
	} catch {
		// already gone
	}
}

function shutdown(code = 0) {
	if (shuttingDown) return;
	shuttingDown = true;
	if (restartTimer) clearTimeout(restartTimer);
	if (stableTimer) clearTimeout(stableTimer);
	console.log('[nimbus] shutting down…');
	terminate(bot);
	terminate(web);
	setTimeout(() => process.exit(typeof code === 'number' ? code : 0), 1_500);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
	process.on(signal, () => shutdown(0));
}

function startBot() {
	if (shuttingDown) return;
	if (!existsSync(botEntry)) {
		console.warn('[nimbus] bot/index.ts not found — starting the web server only.');
		return;
	}

	console.log('[nimbus] starting Discord bot…');
	bot = spawn(node, ['--experimental-strip-types', botEntry], {
		cwd: root,
		stdio: 'inherit',
		env: process.env
	});

	stableTimer = setTimeout(() => {
		botBackoff = 5_000;
	}, 60_000);

	bot.on('exit', (code) => {
		if (stableTimer) clearTimeout(stableTimer);
		bot = null;
		if (shuttingDown) return;

		console.warn(`[nimbus] bot exited with code ${code ?? 'unknown'}.`);
		if (code === 0) {
			console.warn('[nimbus] web server will continue without the bot.');
			return;
		}

		const delay = botBackoff;
		console.warn(`[nimbus] restarting the bot in ${Math.round(delay / 1000)}s…`);
		restartTimer = setTimeout(startBot, delay);
		botBackoff = Math.min(botBackoff * 2, 60_000);
	});
}

async function waitForWeb(timeoutMs = 15_000) {
	const host = process.env.SOCKET_PATH
		? null
		: process.env.HOST && !['0.0.0.0', '::'].includes(process.env.HOST)
			? process.env.HOST
			: '127.0.0.1';
	if (!host) {
		await new Promise((resolveWait) => setTimeout(resolveWait, 1_500));
		return webExitCode === null;
	}

	const port = process.env.PORT || '3000';
	const connectHost = host.includes(':') ? `[${host}]` : host;
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (shuttingDown || webExitCode !== null) return false;
		try {
			const response = await fetch(`http://${connectHost}:${port}/api/health`, {
				signal: AbortSignal.timeout(1_000)
			});
			if (response.ok) return true;
		} catch {
			// not ready yet
		}
		await new Promise((resolveWait) => setTimeout(resolveWait, 500));
	}
	return webExitCode === null;
}

console.log('[nimbus] starting web server…');
web = spawn(node, [webEntry], {
	cwd: root,
	stdio: 'inherit',
	env: process.env
});

web.on('exit', (code, signal) => {
	webExitCode = code ?? (signal ? 1 : 0);
	if (shuttingDown) return;
	console.error(`[nimbus] web server exited (${code ?? signal ?? 'unknown'}).`);
	shutdown(webExitCode);
});

const ready = await waitForWeb();
if (ready && !shuttingDown && webExitCode === null) {
	console.log('[nimbus] web server ready.');
	startBot();
} else if (!shuttingDown) {
	console.warn('[nimbus] web server did not report ready — starting the bot anyway.');
	startBot();
}
