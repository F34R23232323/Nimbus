import { writable } from 'svelte/store';

export interface ConfirmOptions {
	title: string;
	message?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	danger?: boolean;
}

interface ConfirmRequest extends ConfirmOptions {
	resolve: (value: boolean) => void;
}

export const confirmState = writable<ConfirmRequest | null>(null);

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
	return new Promise((resolve) => {
		confirmState.set({ ...options, resolve });
	});
}
