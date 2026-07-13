// Bounding-box math for the geo prefilter.
//
// A radius query first narrows to a lat/lng rectangle (indexed range scan on
// two columns), then haversine refines the survivors to a true circle. The box
// is intentionally a little generous — it must fully contain the circle.

export interface BBox {
	latMin: number;
	latMax: number;
	lngMin: number;
	lngMax: number;
}

const MI_PER_DEG_LAT = 69.0; // ~constant everywhere

/**
 * Compute the lat/lng bounding box that fully contains a circle of `radiusMi`
 * around (lat, lng). Longitude degrees shrink with latitude, hence the cos().
 */
export function bbox(lat: number, lng: number, radiusMi: number): BBox {
	const latDelta = radiusMi / MI_PER_DEG_LAT;
	const miPerDegLng = MI_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
	// Guard against the poles where cos(lat) → 0.
	const lngDelta = radiusMi / Math.max(miPerDegLng, 0.00001);

	return {
		latMin: lat - latDelta,
		latMax: lat + latDelta,
		lngMin: lng - lngDelta,
		lngMax: lng + lngDelta,
	};
}
