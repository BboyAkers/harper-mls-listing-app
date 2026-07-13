export function formatPrice(n?: number): string {
	if (n == null) return '—';
	return `$${n.toLocaleString('en-US')}`;
}

export function formatPriceShort(n?: number): string {
	if (n == null) return '—';
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
	if (n >= 1_000) return `$${Math.round(n / 1000)}k`;
	return `$${n}`;
}

export function metaLine(l: { beds?: number; baths?: number; sqft?: number }): string {
	const parts: string[] = [];
	if (l.beds != null) parts.push(`${l.beds} bd`);
	if (l.baths != null) parts.push(`${l.baths} ba`);
	if (l.sqft != null) parts.push(`${l.sqft.toLocaleString('en-US')} sqft`);
	return parts.join(' · ');
}
