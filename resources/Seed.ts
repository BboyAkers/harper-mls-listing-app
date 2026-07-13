// Seed — loads data/seed.json into Harper, generating a hero photo and a vector
// embedding for each listing on the way in. Kept self-contained: the "photos"
// are generated SVGs (no external image hosting), and embeddings come from the
// pluggable provider in lib/embeddings.ts.
//
//   GET  /Seed   → { seeded: boolean, listings, agents }   (status only)
//   POST /Seed   → loads data (idempotent unless { force: true })

import { Resource, tables, createBlob } from 'harper';
import { readFileSync } from 'node:fs';
import { getEmbedding, embeddingProvider } from '../lib/embeddings.ts';

interface SeedListing {
	id: string;
	description?: string;
	propertyType?: string;
	features?: string[];
	style?: string;
	listPrice?: number;
	beds?: number;
	baths?: number;
	city?: string;
	[key: string]: unknown;
}
interface SeedFile {
	agents: Record<string, unknown>[];
	listings: SeedListing[];
}

function loadSeedFile(): SeedFile {
	const path = new URL('../data/seed.json', import.meta.url);
	return JSON.parse(readFileSync(path, 'utf8')) as SeedFile;
}

async function countListings(): Promise<number> {
	let n = 0;
	for await (const _ of await tables.Listing.search({ select: ['id'], limit: 100000 } as never)) n++;
	return n;
}

export class Seed extends Resource {
	static loadAsInstance = false;

	async get() {
		return {
			seeded: (await countListings()) > 0,
			listings: await countListings(),
			embeddingProvider,
		};
	}

	async post(_target: unknown, body: { force?: boolean } = {}) {
		const existing = await countListings();
		if (existing > 0 && !body?.force) {
			return { skipped: true, reason: 'already seeded', listings: existing };
		}

		const { agents, listings } = loadSeedFile();

		for (const agent of agents) {
			await tables.Agent.put(agent.id as string, agent as never);
		}

		let count = 0;
		for (const listing of listings) {
			const text = [listing.description, listing.propertyType, (listing.features ?? []).join(' ')]
				.filter(Boolean)
				.join('. ');
			const embedding = await getEmbedding(text);
			const heroPhoto = createBlob(Buffer.from(heroSvg(listing)), { type: 'image/svg+xml' });
			// geohash is a computed attribute (see resources/Listing.ts) — the table
			// derives it from lat/lng on write, so we don't set it here.
			await tables.Listing.put(listing.id, { ...listing, embedding, heroPhoto } as never);
			count++;
		}

		return { seeded: true, agents: agents.length, listings: count, embeddingProvider };
	}
}

// --- generated hero photo -----------------------------------------------------

const PALETTES: Record<string, [string, string, string]> = {
	craftsman: ['#e8c39e', '#b5651d', '#5c4033'],
	'midcentury-ranch': ['#f2d5a0', '#e08a3c', '#8a5a2b'],
	'modern-new': ['#d7e3ec', '#5b7a99', '#2b3a4a'],
	'colonial-family': ['#cfe0d0', '#6b8f71', '#3a5240'],
	'downtown-loft': ['#c9c9d6', '#6c6f85', '#2f3140'],
	townhouse: ['#e7d3c8', '#c08457', '#6b4a34'],
	lakefront: ['#bfe3ef', '#4a9fc0', '#215a72'],
	'multi-family': ['#e0dccb', '#a99873', '#5c5138'],
};

/** A simple, pleasant SVG "photo" — sky gradient, sun, a house. No text: the
 * card renders price/address/meta itself, so the image stays clean. */
function heroSvg(l: SeedListing): string {
	const [sky, mid, roof] = PALETTES[l.style ?? ''] ?? PALETTES.craftsman;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" width="640" height="400">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${sky}"/>
      <stop offset="100%" stop-color="${mid}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="400" fill="url(#sky)"/>
  <circle cx="530" cy="90" r="46" fill="#fff" opacity="0.7"/>
  <rect y="300" width="640" height="100" fill="${roof}" opacity="0.25"/>
  <g transform="translate(210 150)">
    <polygon points="110,0 220,90 0,90" fill="${roof}"/>
    <rect x="25" y="90" width="170" height="130" fill="#fff" opacity="0.92"/>
    <rect x="95" y="160" width="40" height="60" fill="${roof}"/>
    <rect x="45" y="112" width="34" height="30" fill="${mid}"/>
    <rect x="141" y="112" width="34" height="30" fill="${mid}"/>
  </g>
</svg>`;
}
