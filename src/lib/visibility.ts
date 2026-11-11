import type { Visibility } from './types';

export type { Visibility };

export function fileVisibility(file: { is_public: number; listed: number }): Visibility {
	if (!file.is_public) return 'private';
	return file.listed ? 'public' : 'unlisted';
}

export function visibilityFlags(visibility: Visibility): { isPublic: number; listed: number } {
	if (visibility === 'private') return { isPublic: 0, listed: 1 };
	if (visibility === 'unlisted') return { isPublic: 1, listed: 0 };
	return { isPublic: 1, listed: 1 };
}

export function normalizeVisibility(value: unknown): Visibility | null {
	if (value === 'public' || value === 'unlisted' || value === 'private') return value;
	return null;
}
