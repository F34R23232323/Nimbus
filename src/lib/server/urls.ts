import { getSettings, siteUrl } from './settings';

export interface LinkableFile {
	id: string;
	ext: string;
}

export function filePath(file: LinkableFile, direct = getSettings().directFileLinks): string {
	const extension = String(file.ext ?? '').replace(/^\./, '');
	return direct && extension ? `/i/${file.id}.${extension}` : `/i/${file.id}`;
}

export function fileAbsoluteUrl(file: LinkableFile, origin: string, direct?: boolean): string {
	return `${siteUrl(origin)}${filePath(file, direct)}`;
}
