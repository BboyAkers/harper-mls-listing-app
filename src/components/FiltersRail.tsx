import { Annotation } from '@/components/Annotation';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatPriceShort } from '@/lib/format';

export interface Filters {
	status: string;
	maxPrice?: number;
	beds?: number;
	propertyType?: string;
	feature?: string;
}

export const DEFAULT_FILTERS: Filters = { status: 'active' };

const PRICES = [500000, 750000, 1000000, 1500000];
const BEDS = [1, 2, 3, 4];
const TYPES = ['single-family', 'condo', 'townhouse', 'multi-family'];
const FEATURES = ['fireplace', 'waterfront', 'smart home', 'basement', 'three car garage', 'city views'];

function Section({
	title,
	annotation,
	show,
	children,
}: {
	title: string;
	annotation?: string;
	show: boolean;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-2.5">
			<div className="flex flex-col gap-0.5">
				<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{title}</span>
				{annotation && <Annotation show={show}>{annotation}</Annotation>}
			</div>
			{children}
		</div>
	);
}

export function FiltersRail({
	filters,
	onChange,
	onReset,
	showInfra,
}: {
	filters: Filters;
	onChange: (f: Filters) => void;
	onReset: () => void;
	showInfra: boolean;
}) {
	const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

	return (
		<aside className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<span className="text-sm font-semibold uppercase tracking-wider">Filters</span>
				<button onClick={onReset} className="text-xs text-primary hover:underline">
					Reset
				</button>
			</div>
			<Annotation show={showInfra} className="-mt-4">
				@indexed columns · replaces Postgres
			</Annotation>

			<Section title="Status" show={false}>
				<ToggleGroup
					type="single"
					variant="outline"
					value={filters.status}
					onValueChange={(v) => v && set({ status: v })}
					className="flex-wrap"
				>
					<ToggleGroupItem value="active">Active</ToggleGroupItem>
					<ToggleGroupItem value="pending">Pending</ToggleGroupItem>
					<ToggleGroupItem value="any">Any</ToggleGroupItem>
				</ToggleGroup>
			</Section>

			<Section title="Max price" show={false}>
				<ToggleGroup
					type="single"
					variant="outline"
					value={filters.maxPrice ? String(filters.maxPrice) : 'any'}
					onValueChange={(v) => set({ maxPrice: v === 'any' || !v ? undefined : Number(v) })}
					className="flex-wrap"
				>
					{PRICES.map((p) => (
						<ToggleGroupItem key={p} value={String(p)}>
							{formatPriceShort(p)}
						</ToggleGroupItem>
					))}
					<ToggleGroupItem value="any">Any</ToggleGroupItem>
				</ToggleGroup>
			</Section>

			<Section title="Beds" show={false}>
				<ToggleGroup
					type="single"
					variant="outline"
					value={filters.beds ? String(filters.beds) : 'any'}
					onValueChange={(v) => set({ beds: v === 'any' || !v ? undefined : Number(v) })}
					className="flex-wrap"
				>
					{BEDS.map((b) => (
						<ToggleGroupItem key={b} value={String(b)}>
							{b}+
						</ToggleGroupItem>
					))}
					<ToggleGroupItem value="any">Any</ToggleGroupItem>
				</ToggleGroup>
			</Section>

			<Section title="Property type" show={false}>
				<ToggleGroup
					type="single"
					variant="outline"
					value={filters.propertyType ?? 'any'}
					onValueChange={(v) => set({ propertyType: v === 'any' || !v ? undefined : v })}
					className="flex-wrap"
				>
					{TYPES.map((t) => (
						<ToggleGroupItem key={t} value={t} className="capitalize">
							{t.replace('-', ' ')}
						</ToggleGroupItem>
					))}
					<ToggleGroupItem value="any">Any</ToggleGroupItem>
				</ToggleGroup>
			</Section>

			<Section title="Amenities" annotation="[String] array index · ?features=" show={showInfra}>
				<div className="flex flex-wrap gap-1.5">
					{FEATURES.map((f) => {
						const on = filters.feature === f;
						return (
							<button
								key={f}
								onClick={() => set({ feature: on ? undefined : f })}
								className={
									'rounded-full border px-2.5 py-1 text-xs capitalize transition-colors ' +
									(on
										? 'border-primary/50 bg-primary/10 text-primary'
										: 'border-border text-muted-foreground hover:text-foreground')
								}
							>
								{f}
							</button>
						);
					})}
				</div>
			</Section>
		</aside>
	);
}
