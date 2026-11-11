interface Bucket {
	count: number;
	resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

function sweep(now: number) {
	if (now - lastSweep < 60_000) return;
	lastSweep = now;
	for (const [key, bucket] of buckets) {
		if (bucket.resetAt < now) buckets.delete(key);
	}
}

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
	const now = Date.now();
	sweep(now);
	const existing = buckets.get(key);
	if (!existing || existing.resetAt < now) {
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		return true;
	}
	if (existing.count >= limit) return false;
	existing.count++;
	return true;
}

export function clientIp(request: Request, fallback = 'unknown'): string {
	const forwarded = request.headers.get('x-forwarded-for');
	if (forwarded) return forwarded.split(',')[0].trim();
	return request.headers.get('x-real-ip') ?? fallback;
}
