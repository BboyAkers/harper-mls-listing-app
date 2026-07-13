// Exact great-circle distance, used to refine the bounding-box candidate set
// down to a true radius and to sort results by distance.

const EARTH_RADIUS_MI = 3958.7613;

function toRad(deg: number): number {
	return (deg * Math.PI) / 180;
}

/** Great-circle distance between two coordinates, in miles. */
export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
	return EARTH_RADIUS_MI * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
