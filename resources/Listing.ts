// Extends the auto-generated Listing table with two pieces of "on ingest" logic
// that would normally each be a separate service:
//
//   1. A computed geohash index (§5) — derived from lat/lng, indexed, so
//      proximity is a cheap prefix lookup. No PostGIS.
//   2. Embed-on-write (§3/§6) — every listing gets a vector embedding of its
//      description + features, populating the HNSW index automatically. No
//      separate embedding pipeline / vector DB.
//
// Because we extend the table (rather than @export it), this class *is* the
// /Listing REST + WebSocket endpoint — full CRUD still works, now with the
// extra behavior folded in.

import { tables } from 'harper';
import type { RequestTargetOrId } from 'harper';
import { encodeGeohash } from '../lib/geohash.ts';
import { getEmbedding } from '../lib/embeddings.ts';

const GEOHASH_PRECISION = 7;

interface ListingRecord {
	lat?: number;
	lng?: number;
	description?: string;
	features?: string[];
	propertyType?: string;
	embedding?: number[];
	[key: string]: unknown;
}

// Register the computed geohash. The resolver runs whenever a record is written
// or the version in the schema is bumped; its output is materialized into the
// indexed `geohash` column.
tables.Listing.setComputedAttribute('geohash', (record: ListingRecord) =>
	record.lat != null && record.lng != null
		? encodeGeohash(record.lat, record.lng, GEOHASH_PRECISION)
		: null,
);

/** Build the text we embed for semantic search. */
function embeddingText(record: ListingRecord): string {
	return [record.description, record.propertyType, (record.features ?? []).join(' ')]
		.filter(Boolean)
		.join('. ')
		.trim();
}

export class Listing extends tables.Listing {
	// Anyone may browse listings (public MLS-style search). Writes still fall
	// through to Harper's default role checks.
	allowRead() {
		return true;
	}

	async post(target: RequestTargetOrId, record: ListingRecord) {
		await this.attachEmbedding(record);
		return super.post(target, record as never);
	}

	async put(target: RequestTargetOrId, record: ListingRecord) {
		await this.attachEmbedding(record);
		return super.put(target, record as never);
	}

	/** Populate `embedding` from the listing's text, unless one was supplied. */
	private async attachEmbedding(record: ListingRecord) {
		if (record.embedding?.length) return;
		const text = embeddingText(record);
		if (text) record.embedding = await getEmbedding(text);
	}
}
