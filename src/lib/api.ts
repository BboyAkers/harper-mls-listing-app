// Thin client over the Harper REST API. Everything is same-origin — one Harper
// instance serves the static frontend, the auto REST endpoints, the custom
// search/photo resources, and the SSE stream. No CORS, no second deploy.

export interface Listing {
	id: string;
	mlsId?: string;
	status: string;
	addressLine?: string;
	city?: string;
	state?: string;
	zip?: string;
	listPrice: number;
	beds?: number;
	baths?: number;
	sqft?: number;
	propertyType?: string;
	yearBuilt?: number;
	description?: string;
	features?: string[];
	style?: string;
	lat?: number;
	lng?: number;
	agentId?: string;
	createdTime?: number;
	distanceMi?: number;
	$distance?: number;
}

export interface SearchParams {
	lat?: number;
	lng?: number;
	radiusMi?: number;
	minPrice?: number;
	maxPrice?: number;
	beds?: number;
	baths?: number;
	propertyType?: string;
	city?: string;
	status?: string;
	feature?: string;
	semantic?: string;
	sort?: string;
	limit?: number;
}

export interface SearchResponse {
	count: number;
	rankedBy: string;
	results: Listing[];
}

export interface Agent {
	id: string;
	name?: string;
	brokerage?: string;
	email?: string;
	phone?: string;
}

const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };

export async function search(params: SearchParams): Promise<SearchResponse> {
	const res = await fetch('/ListingSearch', {
		method: 'POST',
		headers: JSON_HEADERS,
		body: JSON.stringify(params),
	});
	if (!res.ok) throw new Error(`Search failed: ${res.status}`);
	return res.json();
}

export function photoUrl(id: string): string {
	return `/ListingPhoto/${encodeURIComponent(id)}`;
}

export async function getSeedStatus(): Promise<{ seeded: boolean; listings: number; embeddingProvider: string }> {
	const res = await fetch('/Seed', { headers: { Accept: 'application/json' } });
	return res.json();
}

export async function seed(): Promise<unknown> {
	const res = await fetch('/Seed', { method: 'POST', headers: JSON_HEADERS, body: '{}' });
	return res.json();
}

export async function listAgents(): Promise<Agent[]> {
	const res = await fetch('/Agent/?limit(100)', { headers: { Accept: 'application/json' } });
	if (!res.ok) return [];
	return res.json();
}

export async function updateListingStatus(id: string, status: string): Promise<void> {
	await fetch(`/Listing/${encodeURIComponent(id)}`, {
		method: 'PATCH',
		headers: JSON_HEADERS,
		body: JSON.stringify({ status }),
	});
}

export async function createListing(listing: Partial<Listing>): Promise<void> {
	await fetch('/Listing/', {
		method: 'POST',
		headers: JSON_HEADERS,
		body: JSON.stringify(listing),
	});
}

export async function deleteListing(id: string): Promise<void> {
	await fetch(`/Listing/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export interface AlertEvent {
	kind: 'insert' | 'update';
	listing: Listing;
}

/**
 * Live listing changes via Harper's built-in table Pub/Sub (SSE) — the same
 * real-time primitive that replaces Kafka + a socket service. EventSource always
 * negotiates `text/event-stream`, so `/Listing/` streams change events.
 *
 * The table SSE first replays current rows as a baseline burst; we swallow that
 * (marking those ids as known) and only surface genuinely new/changed listings
 * that arrive afterward.
 */
export function openListingStream(onEvent: (e: AlertEvent) => void): () => void {
	const known = new Set<string>();
	let baseline = true;
	// current rows all arrive up front; anything after this window is a real change
	const settle = setTimeout(() => {
		baseline = false;
	}, 2000);

	const source = new EventSource('/Listing/');
	source.onmessage = (ev) => {
		try {
			const frame = JSON.parse(ev.data);
			const listing: Listing = frame.value ?? frame;
			if (!listing?.id) return;
			if (baseline) {
				known.add(listing.id);
				return;
			}
			const kind: AlertEvent['kind'] = known.has(listing.id) ? 'update' : 'insert';
			known.add(listing.id);
			if (listing.status === 'active') onEvent({ kind, listing });
		} catch {
			/* ignore malformed frames */
		}
	};
	source.onerror = () => {
		/* browser auto-reconnects; nothing to do */
	};
	return () => {
		clearTimeout(settle);
		source.close();
	};
}
