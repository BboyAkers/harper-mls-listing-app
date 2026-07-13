// Geohash encode + neighbor computation.
//
// A geohash turns a (lat, lng) pair into a short base-32 string where shared
// prefixes imply spatial proximity. That lets Harper answer "what's near here?"
// with a cheap indexed prefix/IN lookup instead of a dedicated geo index.

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Encode a coordinate to a geohash of the given precision.
 * Precision 7 ≈ a ~150m neighborhood block, a good default for city listings.
 */
export function encodeGeohash(lat: number, lng: number, precision = 7): string {
	let latMin = -90;
	let latMax = 90;
	let lngMin = -180;
	let lngMax = 180;

	let hash = '';
	let bits = 0;
	let bit = 0;
	let even = true;

	while (hash.length < precision) {
		if (even) {
			const mid = (lngMin + lngMax) / 2;
			if (lng >= mid) {
				bit = (bit << 1) + 1;
				lngMin = mid;
			} else {
				bit = bit << 1;
				lngMax = mid;
			}
		} else {
			const mid = (latMin + latMax) / 2;
			if (lat >= mid) {
				bit = (bit << 1) + 1;
				latMin = mid;
			} else {
				bit = bit << 1;
				latMax = mid;
			}
		}

		even = !even;
		if (++bits === 5) {
			hash += BASE32[bit];
			bits = 0;
			bit = 0;
		}
	}

	return hash;
}

const NEIGHBORS: Record<string, [string, string]> = {
	// [even-column encoding, odd-column encoding]
	n: ['p0r21436x8zb9dcf5h7kjnmqesgutwvy', 'bc01fg45238967deuvhjyznpkmstqrwx'],
	s: ['14365h7k9dcfesgujnmqp0r2twvyx8zb', '238967debc01fg45kmstqrwxuvhjyznp'],
	e: ['bc01fg45238967deuvhjyznpkmstqrwx', 'p0r21436x8zb9dcf5h7kjnmqesgutwvy'],
	w: ['238967debc01fg45kmstqrwxuvhjyznp', '14365h7k9dcfesgujnmqp0r2twvyx8zb'],
};
const BORDERS: Record<string, [string, string]> = {
	n: ['prxz', 'bcfguvyz'],
	s: ['028b', '0145hjnp'],
	e: ['bcfguvyz', 'prxz'],
	w: ['0145hjnp', '028b'],
};

function adjacent(hash: string, dir: 'n' | 's' | 'e' | 'w'): string {
	hash = hash.toLowerCase();
	const last = hash.charAt(hash.length - 1);
	let parent = hash.slice(0, -1);
	const type = hash.length % 2; // 0 = even length

	if (BORDERS[dir][type].indexOf(last) !== -1 && parent !== '') {
		parent = adjacent(parent, dir);
	}
	return parent + BASE32[NEIGHBORS[dir][type].indexOf(last)];
}

/**
 * Return the geohash cell plus its 8 surrounding cells. Querying this set with
 * an `IN` condition covers the area around a point without edge-cell gaps.
 */
export function geohashNeighbors(hash: string): string[] {
	const n = adjacent(hash, 'n');
	const s = adjacent(hash, 's');
	return [
		hash,
		n,
		s,
		adjacent(hash, 'e'),
		adjacent(hash, 'w'),
		adjacent(n, 'e'),
		adjacent(n, 'w'),
		adjacent(s, 'e'),
		adjacent(s, 'w'),
	];
}
