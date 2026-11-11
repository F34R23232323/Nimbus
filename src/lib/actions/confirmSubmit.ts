import { confirmDialog, type ConfirmOptions } from '$lib/stores/confirm';

export function confirmSubmit(node: HTMLFormElement, options: ConfirmOptions) {
	let current = options;

	async function onSubmit(event: SubmitEvent) {
		if ((node as HTMLFormElement & { __confirmed?: boolean }).__confirmed) {
			(node as HTMLFormElement & { __confirmed?: boolean }).__confirmed = false;
			return;
		}
		event.preventDefault();
		event.stopImmediatePropagation();
		if (await confirmDialog(current)) {
			(node as HTMLFormElement & { __confirmed?: boolean }).__confirmed = true;
			node.requestSubmit();
		}
	}

	node.addEventListener('submit', onSubmit, true);

	return {
		update(next: ConfirmOptions) {
			current = next;
		},
		destroy() {
			node.removeEventListener('submit', onSubmit, true);
		}
	};
}
