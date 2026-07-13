import { ImageIcon, MapPin } from 'lucide-react';

import { Annotation } from '@/components/Annotation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { photoUrl, type Listing } from '@/lib/api';
import { formatPrice, metaLine } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
	active: 'bg-primary/15 text-primary',
	pending: 'bg-amber-500/15 text-amber-400',
	sold: 'bg-muted text-muted-foreground',
	withdrawn: 'bg-muted text-muted-foreground',
};

function isNew(l: Listing): boolean {
	if (!l.createdTime) return false;
	return Date.now() - l.createdTime < 1000 * 60 * 60 * 24 * 30;
}

export function ListingCard({
	listing,
	showInfra,
	onHover,
	selected,
}: {
	listing: Listing;
	showInfra: boolean;
	onHover?: (id: string | null) => void;
	selected?: boolean;
}) {
	const annotation =
		listing.$distance != null
			? `HNSW · ${(1 - listing.$distance).toFixed(2)} match`
			: listing.distanceMi != null
				? `geohash · ${listing.distanceMi} mi`
				: null;

	return (
		<Card
			onMouseEnter={() => onHover?.(listing.id)}
			onMouseLeave={() => onHover?.(null)}
			className={cn(
				'group gap-0 overflow-hidden py-0 transition-all',
				selected ? 'border-primary/60 ring-1 ring-primary/40' : 'hover:border-border/80',
			)}
		>
			{/* photo (native Blob) */}
			<div className="relative aspect-[16/10] overflow-hidden bg-secondary/40">
				<img
					src={photoUrl(listing.id)}
					alt={listing.addressLine ?? 'Listing'}
					loading="lazy"
					className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
					onError={(e) => ((e.currentTarget as HTMLImageElement).style.visibility = 'hidden')}
				/>
				<div className="pointer-events-none absolute inset-0 -z-10 grid place-items-center text-muted-foreground/40">
					<div className="flex flex-col items-center gap-1">
						<ImageIcon className="size-8" />
						<span className="mono text-[11px]">Listing photo</span>
					</div>
				</div>

				{/* status pills */}
				<div className="absolute left-3 top-3 flex items-center gap-2">
					<Badge className={cn('capitalize backdrop-blur', STATUS_STYLES[listing.status] ?? STATUS_STYLES.active)}>
						{listing.status}
					</Badge>
					{isNew(listing) && (
						<Badge className="bg-new font-bold uppercase text-primary-foreground">new</Badge>
					)}
				</div>

				{showInfra && (
					<span className="absolute bottom-3 left-3 rounded bg-background/80 px-1.5 py-0.5">
						<Annotation>Blob</Annotation>
					</span>
				)}
				{showInfra && annotation && (
					<span className="absolute bottom-3 right-3 rounded bg-background/80 px-1.5 py-0.5">
						<Annotation>{annotation}</Annotation>
					</span>
				)}
			</div>

			{/* body */}
			<CardContent className="flex flex-1 flex-col gap-1 p-4">
				<div className="flex items-baseline justify-between gap-2">
					<span className="text-xl font-semibold tracking-tight">{formatPrice(listing.listPrice)}</span>
					<Badge variant="outline" className="mono text-[10px] capitalize text-muted-foreground">
						{listing.propertyType}
					</Badge>
				</div>
				<div className="truncate font-medium">{listing.addressLine}</div>
				<div className="flex items-center gap-1 text-sm text-muted-foreground">
					<MapPin className="size-3.5 shrink-0" />
					<span className="truncate">
						{listing.city}, {listing.state}
					</span>
				</div>
				<div className="mono mt-1 text-xs text-muted-foreground">{metaLine(listing)}</div>
			</CardContent>
		</Card>
	);
}
