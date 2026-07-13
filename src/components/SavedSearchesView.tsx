import { Bell, Trash2 } from 'lucide-react';

import { Annotation } from '@/components/Annotation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatPriceShort } from '@/lib/format';
import type { SavedSearch } from '@/lib/savedSearches';

function describe(p: SavedSearch['params']): string {
	const bits: string[] = [];
	if (p.semantic) bits.push(`"${p.semantic}"`);
	if (p.city) bits.push(p.city);
	if (p.beds) bits.push(`${p.beds}+ bd`);
	if (p.maxPrice) bits.push(`≤ ${formatPriceShort(p.maxPrice)}`);
	if (p.propertyType) bits.push(p.propertyType);
	if (p.feature) bits.push(p.feature);
	if (p.lat != null) bits.push(`${p.radiusMi ?? 5}mi radius`);
	if (p.status && p.status !== 'active') bits.push(p.status);
	return bits.join(' · ') || 'all active listings';
}

export function SavedSearchesView({
	saved,
	onRemove,
	showInfra,
}: {
	saved: SavedSearch[];
	onRemove: (id: string) => void;
	showInfra: boolean;
}) {
	return (
		<div className="mx-auto max-w-[900px] px-4 py-8 sm:px-6">
			<h2 className="text-lg font-semibold">Saved searches</h2>
			<Annotation show={showInfra} className="mt-1 block">
				each row is a live Harper Pub/Sub subscription (SSE) · replaces Kafka + a worker
			</Annotation>

			{saved.length === 0 ? (
				<Card className="mt-6 border-dashed">
					<CardContent className="grid place-items-center py-16 text-center text-muted-foreground">
						<Bell className="mb-2 size-6 opacity-50" />
						No saved searches yet. Run a search and hit “Save &amp; alert me”.
					</CardContent>
				</Card>
			) : (
				<div className="mt-6 flex flex-col gap-3">
					{saved.map((s) => (
						<Card key={s.id} className="py-0">
							<CardContent className="flex items-center justify-between p-4">
								<div className="flex items-center gap-3">
									<span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
										<Bell className="size-4" />
									</span>
									<div>
										<div className="font-medium">{s.label}</div>
										<div className="mono text-xs text-muted-foreground">{describe(s.params)}</div>
									</div>
								</div>
								<div className="flex items-center gap-3">
									<Badge variant="outline" className="gap-1.5 border-primary/40 text-primary">
										<span className="size-1.5 animate-pulse rounded-full bg-primary" /> live
									</Badge>
									<Button
										variant="ghost"
										size="icon"
										className="size-8 text-muted-foreground hover:text-destructive"
										onClick={() => onRemove(s.id)}
									>
										<Trash2 className="size-4" />
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
