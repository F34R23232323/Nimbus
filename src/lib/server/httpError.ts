import { isHttpError } from '@sveltejs/kit';

export function httpErrorDetails(err: unknown): { status: number; message: string } | null {
	if (isHttpError(err)) {
		const body: unknown = err.body;
		let message = 'Request failed.';
		if (typeof body === 'string') message = body;
		else if (body && typeof body === 'object' && 'message' in body) {
			message = String((body as { message: unknown }).message);
		}
		return { status: err.status, message };
	}

	// adapter-node raises SvelteKitError (not HttpError) when BODY_SIZE_LIMIT
	// is exceeded while reading multipart uploads.
	if (err && typeof err === 'object' && 'status' in err) {
		const status = Number((err as { status: unknown }).status);
		if (Number.isInteger(status) && status >= 400 && status <= 599) {
			const source = err as { text?: unknown; message?: unknown };
			const message =
				status === 413
					? 'This upload is larger than the server is configured to accept.'
					: typeof source.text === 'string'
						? source.text
						: typeof source.message === 'string'
							? source.message
							: 'Request failed.';
			return { status, message };
		}
	}

	return null;
}
