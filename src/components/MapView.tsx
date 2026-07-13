import 'leaflet/dist/leaflet.css';

import { useEffect } from 'react';
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';

import { Annotation } from '@/components/Annotation';
import type { Listing } from '@/lib/api';
import { formatPriceShort } from '@/lib/format';

// Indianapolis metro — initial view.
const METRO_CENTER: [number, number] = [39.86, -86.13];
const METRO_ZOOM = 10;

const STATUS_COLOR: Record<string, string> = {
	active: '#34d399',
	pending: '#f5b445',
	sold: '#8a978f',
};
const HARPER = '#34d399';

/** Drop a search center on click → the parent turns it into a bbox + haversine query. */
function ClickToSearch({ onPick }: { onPick: (lat: number, lng: number) => void }) {
	useMapEvents({
		click(e) {
			onPick(e.latlng.lat, e.latlng.lng);
		},
	});
	return null;
}

/** Keep the map centered on an externally-set search point. */
function Recenter({ center }: { center?: { lat: number; lng: number } }) {
	const map = useMap();
	useEffect(() => {
		if (center) map.flyTo([center.lat, center.lng], Math.max(map.getZoom(), 11), { duration: 0.6 });
	}, [center, map]);
	return null;
}

/**
 * An open-source map (Leaflet + OpenStreetMap/CARTO tiles). Listings are vector
 * CircleMarkers positioned by lat/lng; clicking drops a search center whose
 * radius Harper resolves with a bounding-box prefilter + haversine refine —
 * viewport → geo query, no PostGIS.
 */
export function MapView({
	results,
	center,
	radiusMi,
	onPick,
	hoveredId,
	onHover,
	showInfra,
}: {
	results: Listing[];
	center?: { lat: number; lng: number };
	radiusMi: number;
	onPick: (lat: number, lng: number) => void;
	hoveredId: string | null;
	onHover: (id: string | null) => void;
	showInfra: boolean;
}) {
	return (
		<div className="relative overflow-hidden rounded-xl border border-border">
			<div className="pointer-events-none absolute left-3 top-3 z-[500]">
				<Annotation show={showInfra} className="rounded bg-background/80 px-1.5 py-0.5">
					viewport → bbox + haversine · replaces PostGIS
				</Annotation>
			</div>
			<div className="absolute right-3 top-3 z-[500] rounded-md border border-border bg-background/80 px-2 py-1 text-xs text-muted-foreground">
				click map to search here · {radiusMi} mi radius
			</div>

			<MapContainer
				center={center ? [center.lat, center.lng] : METRO_CENTER}
				zoom={METRO_ZOOM}
				scrollWheelZoom
				className="h-[560px] w-full bg-card"
				style={{ background: 'var(--card)' }}
			>
				<TileLayer
					url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
					subdomains="abcd"
					maxZoom={20}
				/>

				<ClickToSearch onPick={onPick} />
				<Recenter center={center} />

				{center && (
					<Circle
						center={[center.lat, center.lng]}
						radius={radiusMi * 1609.34}
						pathOptions={{ color: HARPER, weight: 1.5, dashArray: '4 4', fillColor: HARPER, fillOpacity: 0.08 }}
					/>
				)}

				{results
					.filter((r) => r.lat != null && r.lng != null)
					.map((r) => {
						const active = hoveredId === r.id;
						const color = STATUS_COLOR[r.status] ?? HARPER;
						return (
							<CircleMarker
								key={r.id}
								center={[r.lat!, r.lng!]}
								radius={active ? 9 : 6}
								pathOptions={{
									color: 'var(--background)',
									weight: 1.5,
									fillColor: color,
									fillOpacity: active ? 1 : 0.85,
								}}
								eventHandlers={{
									mouseover: () => onHover(r.id),
									mouseout: () => onHover(null),
									click: () => r.lat != null && onPick(r.lat, r.lng!),
								}}
							>
								<Tooltip direction="top" offset={[0, -6]} opacity={1}>
									<div className="text-xs">
										<div className="font-semibold">{formatPriceShort(r.listPrice)}</div>
										<div className="text-muted-foreground">
											{r.addressLine} · {r.city}
										</div>
									</div>
								</Tooltip>
							</CircleMarker>
						);
					})}
			</MapContainer>
		</div>
	);
}
