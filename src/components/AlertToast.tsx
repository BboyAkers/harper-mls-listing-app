import { X } from 'lucide-react';

import { Annotation } from '@/components/Annotation';
import type { Listing } from '@/lib/api';
import { formatPrice } from '@/lib/format';

/**
 * The live "new match" / "price drop" card, rendered inside a sonner toast.
 * Off the Harper Pub/Sub SSE stream.
 */
export function AlertCard({
	kind,
	listing,
	showInfra,
	onDismiss,
}: {
	kind: string;
	listing: Listing;
	showInfra: boolean;
	onDismiss: () => void;
}) {
	return (
		<div className="w-[320px] rounded-xl border border-primary/40 bg-card/95 p-3.5 shadow-xl backdrop-blur">
			<div className="flex items-center justify-between">
				<span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
					<span className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
					{kind}
				</span>
				<button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
					<X className="size-3.5" />
				</button>
			</div>
			<div className="mt-1.5 text-sm font-medium">{listing.addressLine ?? 'New listing'}</div>
			<div className="text-xs text-muted-foreground">
				{formatPrice(listing.listPrice)} · {listing.city}
			</div>
			<Annotation show={showInfra} className="mt-1.5 block">
				via Harper Pub/Sub (SSE)
			</Annotation>
		</div>
	);
}
