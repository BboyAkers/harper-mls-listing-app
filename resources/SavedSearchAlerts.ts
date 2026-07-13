// SavedSearchAlerts — "notify me when a new place matches my search" (§8).
//
// The feature every listings site has and every buyer actually uses. In a
// traditional stack this is a Kafka topic plus a worker plus a websocket
// service. In Harper it's a subscription: this Resource subscribes to Listing
// changes and streams the ones that satisfy a stored (or inline) filter.
//
// Works as both Server-Sent Events and WebSocket — the same async generator
// serves both transports.
//
//   EventSource:  /SavedSearchAlerts/{savedSearchId}
//   or inline:    /SavedSearchAlerts/?status=active&maxPrice=500000&beds=3&city=Fishers

import { Resource, tables } from 'harper';
import type { RequestTarget } from 'harper';

interface Criteria {
	status?: string;
	minPrice?: number;
	maxPrice?: number;
	beds?: number;
	baths?: number;
	city?: string;
	propertyType?: string;
	feature?: string;
}

interface ListingLike {
	id?: string;
	status?: string;
	listPrice?: number;
	beds?: number;
	baths?: number;
	city?: string;
	propertyType?: string;
	features?: string[];
	addressLine?: string;
	[key: string]: unknown;
}

export class SavedSearchAlerts extends Resource {
	allowRead() {
		return true;
	}

	async *connect(target: RequestTarget) {
		const criteria = await this.resolveCriteria(target);

		// Announce the active filter so clients can confirm the stream is live.
		yield { type: 'connected', criteria };

		// Only future changes — buyers want new matches, not a replay of the DB.
		const subscription = await tables.Listing.subscribe({
			omitCurrent: true,
		} as never);

		for await (const event of subscription as AsyncIterable<Record<string, unknown>>) {
			const record = extractRecord(event);
			if (!record) continue;
			if (matches(record, criteria)) {
				yield {
					type: eventType(event),
					listing: {
						id: record.id,
						addressLine: record.addressLine,
						city: record.city,
						listPrice: record.listPrice,
						beds: record.beds,
						baths: record.baths,
						propertyType: record.propertyType,
						status: record.status,
					},
				};
			}
		}
	}

	private async resolveCriteria(target: RequestTarget): Promise<Criteria> {
		if (target.id) {
			const saved = (await tables.SavedSearch.get(target.id)) as
				| { criteria?: Criteria }
				| undefined;
			if (saved?.criteria) return saved.criteria;
		}
		// Fall back to inline query-string criteria.
		const num = (k: string) => {
			const v = target.get(k);
			return v == null || v === '' ? undefined : Number(v);
		};
		const str = (k: string) => target.get(k) ?? undefined;
		return {
			status: str('status') ?? 'active',
			minPrice: num('minPrice'),
			maxPrice: num('maxPrice'),
			beds: num('beds'),
			baths: num('baths'),
			city: str('city'),
			propertyType: str('propertyType'),
			feature: str('feature'),
		};
	}
}

function extractRecord(event: Record<string, unknown>): ListingLike | null {
	// Subscription events may deliver the record directly or wrapped.
	const rec = (event.value ?? event.record ?? event) as ListingLike;
	return rec && typeof rec === 'object' ? rec : null;
}

function eventType(event: Record<string, unknown>): string {
	const op = (event.type ?? event.operation) as string | undefined;
	return op ? `listing.${op}` : 'listing.match';
}

function matches(r: ListingLike, c: Criteria): boolean {
	if (c.status && c.status !== 'any' && r.status !== c.status) return false;
	if (c.minPrice != null && (r.listPrice ?? 0) < c.minPrice) return false;
	if (c.maxPrice != null && (r.listPrice ?? Infinity) > c.maxPrice) return false;
	if (c.beds != null && (r.beds ?? 0) < c.beds) return false;
	if (c.baths != null && (r.baths ?? 0) < c.baths) return false;
	if (c.city && r.city !== c.city) return false;
	if (c.propertyType && r.propertyType !== c.propertyType) return false;
	if (c.feature && !(r.features ?? []).includes(c.feature)) return false;
	return true;
}
