import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
	id: number;
	message: string;
	kind: ToastKind;
	detail?: string;
}

export const toasts = writable<Toast[]>([]);
let toastId = 0;

export function toast(message: string, kind: ToastKind = 'info', detail?: string) {
	if (!browser) return;
	const id = ++toastId;
	toasts.update((list) => [...list, { id, message, kind, detail }]);
	setTimeout(() => dismissToast(id), kind === 'error' ? 6000 : 3800);
}

export function dismissToast(id: number) {
	toasts.update((list) => list.filter((t) => t.id !== id));
}

export const theme = writable<'light' | 'dark'>('dark');
export const accent = writable<string>('#c8a878');
export const reducedMotion = writable<boolean>(false);

export function applyTheme(next: 'light' | 'dark') {
	theme.set(next);
	if (!browser) return;
	document.documentElement.classList.toggle('dark', next === 'dark');
	document.documentElement.dataset.theme = next;
	localStorage.setItem('nimbus:theme', next);
}

export function toggleTheme() {
	let next: 'light' | 'dark' = 'dark';
	theme.update((current) => {
		next = current === 'dark' ? 'light' : 'dark';
		return next;
	});
	applyTheme(next);
}

export function applyAccent(hex: string) {
	accent.set(hex);
	if (!browser) return;
	const rgb = hexToRgb(hex);
	if (!rgb) return;
	document.documentElement.style.setProperty('--accent', rgb);
	localStorage.setItem('nimbus:accent', hex);
}

export function setReducedMotion(value: boolean) {
	reducedMotion.set(value);
	if (!browser) return;
	document.documentElement.classList.toggle('reduce-motion', value);
	localStorage.setItem('nimbus:reduced-motion', value ? '1' : '0');
}

export function hydrateUiPrefs() {
	if (!browser) return;
	const storedTheme = localStorage.getItem('nimbus:theme');
	applyTheme(storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'dark');
	const storedAccent = localStorage.getItem('nimbus:accent');
	if (storedAccent && storedAccent.toLowerCase() !== '#6366f1') applyAccent(storedAccent);
	setReducedMotion(localStorage.getItem('nimbus:reduced-motion') === '1');
}

function hexToRgb(hex: string): string | null {
	const clean = hex.replace('#', '').trim();
	const full =
		clean.length === 3
			? clean
					.split('')
					.map((c) => c + c)
					.join('')
			: clean;
	if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
	return `${parseInt(full.slice(0, 2), 16)} ${parseInt(full.slice(2, 4), 16)} ${parseInt(full.slice(4, 6), 16)}`;
}
