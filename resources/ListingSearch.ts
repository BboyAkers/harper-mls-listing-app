// ListingSearch — the converged-stack money shot (§6).
//
// "Homes under $500k, 3+ beds, within 5 miles of here, that feel like a quiet
// mid-century ranch" is ONE request against ONE process:
//
//   structured filters  (price / beds / baths / type / city)   — indexed columns
//   geo                 (bounding box → haversine refine)       — indexed lat/lng
//   semantic            (HNSW vector ranking on `embedding`)     — vector index
//
// No fan-out to Postgres + a geo service + Elastic/pgvector, and no stitching
// result sets back together in an API tier.
//
//   POST /ListingSearch   { "lat":39.95, "lng":-86.01, "radiusMi":5,
//                           "beds":3, "maxPrice":500000, "semantic":"cozy craftsman" }
//
// Structured filters come through the JSON BODY, not the query string: query
// params on a custom resource are parsed by Harper as table conditions and
// rejected as "not a defined attribute". `loadAsInstance = false` makes this a
// singleton endpoint whose body arrives as the second argument.

import { Resource, tables } from 'harper';
import { bbox } from '../lib/bbox.ts';
import { haversineMiles } from '../lib/haversine.ts';
import { getEmbedding } from '../lib/embeddings.ts';

interface SearchParams {
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
	sort?: string; // 'newest' | 'price_asc' | 'price_desc'
	limit?: number;
}

// Fields returned to the client — everything a result card needs, minus the
// heavy columns (embedding vector, photo blobs). Photos load lazily via
// /ListingPhoto/{id}.
const SELECT = [
	'id',
	'mlsId',
	'status',
	'addressLine',
	'city',
	'state',
	'zip',
	'listPrice',
	'beds',
	'baths',
	'sqft',
	'propertyType',
	'yearBuilt',
	'description',
	'features',
	'style',
	'lat',
	'lng',
	'agentId',
	'createdTime',
];

// Candidate cap for the geo/structured prefilter before haversine refine.
const CANDIDATE_LIMIT = 250;

export class ListingSearch extends Resource {
	static loadAsInstance = false;

	// GET with no params → browse everything (cheapest first).
	async get() {
		return this.run({});
	}

	// POST is the primary interface; the JSON body carries the search params.
	async post(_target: unknown, body: SearchParams) {
		return this.run(body ?? {});
	}

	private async run(params: SearchParams) {
		const {
			lat,
			lng,
			radiusMi = 10,
			minPrice,
			maxPrice,
			beds,
			baths,
			propertyType,
			city,
			status = 'active',
			feature,
			semantic,
			sort,
			limit = 60,
		} = params;

		// --- Build indexed conditions (structured + geo prefilter) ---
		const conditions: Array<Record<string, unknown>> = [];
		if (status && status !== 'any')
			conditions.push({ attribute: 'status', comparator: 'equals', value: status });
		if (beds)
			conditions.push({ attribute: 'beds', comparator: 'greater_than_equal', value: beds });
		if (baths)
			conditions.push({ attribute: 'baths', comparator: 'greater_than_equal', value: baths });
		if (minPrice)
			conditions.push({ attribute: 'listPrice', comparator: 'greater_than_equal', value: minPrice });
		if (maxPrice)
			conditions.push({ attribute: 'listPrice', comparator: 'less_than_equal', value: maxPrice });
		if (propertyType)
			conditions.push({ attribute: 'propertyType', comparator: 'equals', value: propertyType });
		if (city) conditions.push({ attribute: 'city', comparator: 'equals', value: city });
		if (feature) conditions.push({ attribute: 'features', comparator: 'contains', value: feature });

		const hasGeo = lat != null && lng != null;
		if (hasGeo) {
			const box = bbox(lat, lng, radiusMi);
			conditions.push({ attribute: 'lat', comparator: 'between', value: [box.latMin, box.latMax] });
			conditions.push({ attribute: 'lng', comparator: 'between', value: [box.lngMin, box.lngMax] });
		}

		// --- Assemble the query. A semantic phrase adds a vector sort. ---
		const query: Record<string, unknown> = {
			conditions,
			select: SELECT,
			limit: CANDIDATE_LIMIT,
		};

		const isSemantic = Boolean(semantic && semantic.trim());
		if (isSemantic) {
			const target = await getEmbedding(semantic!.trim());
			query.select = [...SELECT, '$distance'];
			query.sort = { attribute: 'embedding', target };
		}

		// --- Execute (one call, one process) ---
		const rows: Array<Record<string, unknown>> = [];
		for await (const row of await tables.Listing.search(query as never)) {
			rows.push(row as Record<string, unknown>);
		}

		// --- Geo refine: exact distance, drop anything outside the true radius ---
		let results = rows;
		if (hasGeo) {
			results = rows
				.map((r) => ({
					...r,
					distanceMi:
						Math.round(haversineMiles(lat, lng, r.lat as number, r.lng as number) * 100) / 100,
				}))
				.filter((r) => (r.distanceMi as number) <= radiusMi);
		}

		// --- Rank: semantic → vector proximity; else the requested sort; else geo/price ---
		let rankedBy: string;
		if (isSemantic) {
			results.sort((a, b) => ((a.$distance as number) ?? 0) - ((b.$distance as number) ?? 0));
			rankedBy = 'semantic';
		} else if (sort === 'price_asc') {
			results.sort((a, b) => ((a.listPrice as number) ?? 0) - ((b.listPrice as number) ?? 0));
			rankedBy = 'price_asc';
		} else if (sort === 'price_desc') {
			results.sort((a, b) => ((b.listPrice as number) ?? 0) - ((a.listPrice as number) ?? 0));
			rankedBy = 'price_desc';
		} else if (sort === 'newest') {
			results.sort((a, b) => ((b.createdTime as number) ?? 0) - ((a.createdTime as number) ?? 0));
			rankedBy = 'newest';
		} else if (hasGeo) {
			results.sort((a, b) => (a.distanceMi as number) - (b.distanceMi as number));
			rankedBy = 'distance';
		} else {
			results.sort((a, b) => ((a.listPrice as number) ?? 0) - ((b.listPrice as number) ?? 0));
			rankedBy = 'price_asc';
		}

		return {
			count: results.length,
			rankedBy,
			results: results.slice(0, limit),
		};
	}
}
