export function formatBytes(bytes: number, decimals = 1): string {
	if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
	const value = bytes / Math.pow(1024, i);
	return `${value.toFixed(i === 0 ? 0 : decimals).replace(/\.0$/, '')} ${units[i]}`;
}

export function formatNumber(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
	return String(n ?? 0);
}

export function timeAgo(input: number | Date): string {
	const date = input instanceof Date ? input : new Date(input);
	const seconds = Math.round((Date.now() - date.getTime()) / 1000);
	if (!Number.isFinite(seconds)) return '';
	if (seconds < 45) return 'just now';
	if (seconds < 90) return '1 min ago';
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `${minutes} min ago`;
	const hours = Math.round(minutes / 60);
	if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
	const days = Math.round(hours / 24);
	if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
	if (days < 30) return `${Math.round(days / 7)} wk ago`;
	if (days < 365) return `${Math.round(days / 30)} mo ago`;
	return `${(days / 365).toFixed(1).replace(/\.0$/, '')} yr ago`;
}

export function formatDate(input: number | Date | null | undefined, withTime = false): string {
	if (!input) return '—';
	const d = input instanceof Date ? input : new Date(input);
	if (Number.isNaN(d.getTime())) return '—';
	return d.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		...(withTime ? { hour: '2-digit', minute: '2-digit' } : {})
	});
}

export function formatDateTimeLocal(input: number | Date): string {
	const d = input instanceof Date ? input : new Date(input);
	const pad = (v: number) => String(v).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function plural(count: number, singular: string, pluralForm?: string): string {
	return `${count} ${count === 1 ? singular : pluralForm ?? singular + 's'}`;
}

export function initials(name: string): string {
	return name
		.split(/[\s._-]+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? '')
		.join('');
}

export function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

export function isImageMime(mime: string): boolean {
	return mime.startsWith('image/');
}

export function isVideoMime(mime: string): boolean {
	return mime.startsWith('video/');
}

export function prettyMime(mime: string): string {
	const sub = mime.split('/')[1] ?? mime;
	return sub.replace('svg+xml', 'SVG').replace('jpeg', 'JPEG').toUpperCase();
}

export function truncate(value: string, length = 40): string {
	if (value.length <= length) return value;
	const dot = value.lastIndexOf('.');
	if (dot > 0 && dot > length - 8) return value.slice(0, length - 8) + '…' + value.slice(dot);
	return value.slice(0, length - 1) + '…';
}

export function slugify(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

export async function copyText(text: string): Promise<boolean> {
	try {
		if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
			await navigator.clipboard.writeText(text);
			return true;
		}
		const ta = document.createElement('textarea');
		ta.value = text;
		ta.style.position = 'fixed';
		ta.style.opacity = '0';
		document.body.appendChild(ta);
		ta.select();
		const ok = document.execCommand('copy');
		document.body.removeChild(ta);
		return ok;
	} catch {
		return false;
	}
}

export function absolute(path: string, origin = ''): string {
	if (/^https?:\/\//i.test(path)) return path;
	return `${origin.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function percent(part: number, total: number): number {
	if (!total) return 0;
	return Math.min(100, Math.round((part / total) * 100));
}

export function ranges(count: number, perPage: number): number[] {
	return Array.from({ length: Math.max(1, Math.ceil(count / perPage)) }, (_, i) => i + 1);
}
