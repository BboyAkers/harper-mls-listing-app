import { Grip, LayoutGrid, Loader2, Map as MapIcon, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Annotation } from '@/components/Annotation';
import { DEFAULT_FILTERS, FiltersRail, type Filters } from '@/components/FiltersRail';
import { ListingCard } from '@/components/ListingCard';
import { MapView } from '@/components/MapView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { search, type Listing, type SearchParams } from '@/lib/api';
import { cn } from '@/lib/utils';

const TRY = ['cozy craftsman near a park', 'quiet mid-century ranch', 'sleek modern downtown loft'];
const RADII = [3, 5, 10, 25];

type Sort = 'relevance' | 'newest' | 'price_asc' | 'price_desc';

export function SearchView({
	showInfra,
	onSaveSearch,
}: {
	showInfra: boolean;
	onSaveSearch: (params: SearchParams, label: string) => void;
}) {
	const [semantic, setSemantic] = useState('');
	const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
	const [sort, setSort] = useState<Sort>('newest');
	const [view, setView] = useState<'grid' | 'map'>('grid');
	const [city, setCity] = useState<string | undefined>(undefined);
	const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
	const [radiusMi, setRadiusMi] = useState(5);

	const [results, setResults] = useState<Listing[]>([]);
	const [rankedBy, setRankedBy] = useState('');
	const [loading, setLoading] = useState(true);
	const [hoveredId, setHoveredId] = useState<string | null>(null);
	const [cityCounts, setCityCounts] = useState<{ city: string; n: number }[]>([]);

	const params: SearchParams = useMemo(
		() => ({
			semantic: semantic.trim() || undefined,
			status: filters.status,
			maxPrice: filters.maxPrice,
			beds: filters.beds,
			propertyType: filters.propertyType,
			feature: filters.feature,
			city: geo ? undefined : city,
			lat: geo?.lat,
			lng: geo?.lng,
			radiusMi: geo ? radiusMi : undefined,
			sort: semantic.trim() ? undefined : sort === 'relevance' ? undefined : sort,
			limit: 60,
		}),
		[semantic, filters, sort, city, geo, radiusMi],
	);

	// debounce semantic typing; other changes fire immediately
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const runSearch = useCallback(async (p: SearchParams) => {
		setLoading(true);
		try {
			const res = await search(p);
			setResults(res.results);
			setRankedBy(res.rankedBy);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => runSearch(params), semantic ? 250 : 0);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [params, runSearch, semantic]);

	// one-time city counts (active listings)
	useEffect(() => {
		search({ status: 'active', limit: 300 }).then((res) => {
			const counts = new Map<string, number>();
			for (const r of res.results) if (r.city) counts.set(r.city, (counts.get(r.city) ?? 0) + 1);
			setCityCounts(
				[...counts.entries()]
					.map(([c, n]) => ({ city: c, n }))
					.sort((a, b) => b.n - a.n)
					.slice(0, 5),
			);
		});
	}, []);

	const activeSort: Sort = semantic.trim() ? 'relevance' : sort;

	return (
		<div className="mx-auto max-w-[1400px] px-4 pb-16 sm:px-6">
			{/* semantic search hero */}
			<section className="relative py-8">
				<div className="mb-3 flex items-center gap-3">
					<span className="text-sm font-semibold uppercase tracking-wider text-primary">
						{'// semantic search'}
					</span>
					<Annotation show={showInfra} className="rounded-full border border-border px-2 py-0.5">
						@indexed(type:"HNSW") · replaces pgvector / Pinecone
					</Annotation>
				</div>
				<div className="relative">
					<Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-primary" />
					<Input
						value={semantic}
						onChange={(e) => setSemantic(e.target.value)}
						placeholder={'Describe the home you want — "cozy craftsman near a park"'}
						className="h-14 rounded-xl pl-12 pr-10 text-base shadow-[0_0_40px_-12px_var(--primary)] md:text-base"
					/>
					{semantic && (
						<button
							onClick={() => setSemantic('')}
							className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						>
							<X className="size-4" />
						</button>
					)}
				</div>
				<div className="mt-3 flex flex-wrap items-center gap-2">
					<span className="mono text-xs text-muted-foreground">Try:</span>
					{TRY.map((t) => (
						<button
							key={t}
							onClick={() => setSemantic(t)}
							className="mono rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
						>
							{t}
						</button>
					))}
				</div>
			</section>

			{/* toolbar */}
			<div className="flex flex-wrap items-center gap-3 border-y border-border py-3">
				<div className="flex items-center gap-1 overflow-x-auto">
					<CityTab label="All" active={!city && !geo} onClick={() => { setCity(undefined); setGeo(null); }} />
					{cityCounts.map((c) => (
						<CityTab
							key={c.city}
							label={c.city}
							count={c.n}
							active={city === c.city && !geo}
							onClick={() => { setGeo(null); setCity(c.city); }}
						/>
					))}
				</div>

				<div className="ml-auto flex items-center gap-3">
					<span className="mono text-sm text-muted-foreground">
						{loading ? '…' : results.length} home{results.length === 1 ? '' : 's'}
						{showInfra && rankedBy && (
							<span className="annotation ml-2">{`// ranked: ${rankedBy}`}</span>
						)}
					</span>

					{/* sort */}
					<div className="flex items-center gap-1 rounded-md border border-border p-0.5">
						<SortBtn label="Newest" on={activeSort === 'newest'} disabled={!!semantic.trim()} onClick={() => setSort('newest')} />
						<SortBtn label="Price ↑" on={activeSort === 'price_asc'} disabled={!!semantic.trim()} onClick={() => setSort('price_asc')} />
						<SortBtn label="Price ↓" on={activeSort === 'price_desc'} disabled={!!semantic.trim()} onClick={() => setSort('price_desc')} />
						{semantic.trim() && <SortBtn label="Relevance" on onClick={() => {}} />}
					</div>

					{/* view toggle */}
					<ToggleGroup
						type="single"
						variant="outline"
						size="sm"
						value={view}
						onValueChange={(v) => v && setView(v as 'grid' | 'map')}
						className="rounded-md border border-border p-0.5"
					>
						<ToggleGroupItem value="grid" className="border-0" aria-label="Grid view">
							<LayoutGrid className="size-4" />
						</ToggleGroupItem>
						<ToggleGroupItem value="map" className="border-0" aria-label="Map view">
							<MapIcon className="size-4" />
						</ToggleGroupItem>
					</ToggleGroup>

					<Button
						variant="outline"
						size="sm"
						onClick={() => onSaveSearch(params, semantic.trim() || city || 'My search')}
					>
						<Grip className="size-3.5" /> Save &amp; alert me
					</Button>
				</div>
			</div>

			{/* geo radius control when a point is dropped */}
			{geo && (
				<div className="mt-3 flex items-center gap-2 text-sm">
					<span className="mono text-muted-foreground">
						searching {radiusMi} mi around ({geo.lat.toFixed(3)}, {geo.lng.toFixed(3)})
					</span>
					<div className="flex items-center gap-1 rounded-md border border-border p-0.5">
						{RADII.map((r) => (
							<button
								key={r}
								onClick={() => setRadiusMi(r)}
								className={cn('mono rounded px-2 py-0.5 text-xs', radiusMi === r ? 'bg-secondary text-foreground' : 'text-muted-foreground')}
							>
								{r}mi
							</button>
						))}
					</div>
					<button onClick={() => setGeo(null)} className="text-xs text-primary hover:underline">
						clear
					</button>
				</div>
			)}

			{/* body: filters + results/map */}
			<div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
				<FiltersRail
					filters={filters}
					onChange={setFilters}
					onReset={() => { setFilters(DEFAULT_FILTERS); setCity(undefined); setGeo(null); }}
					showInfra={showInfra}
				/>

				<div className="relative min-h-[400px]">
					{loading && (
						<div className="absolute inset-x-0 top-0 z-10 flex justify-center py-2">
							<Loader2 className="size-5 animate-spin text-primary" />
						</div>
					)}

					{view === 'map' ? (
						<MapView
							results={results}
							center={geo ?? undefined}
							radiusMi={radiusMi}
							onPick={(lat, lng) => { setCity(undefined); setGeo({ lat, lng }); }}
							hoveredId={hoveredId}
							onHover={setHoveredId}
							showInfra={showInfra}
						/>
					) : results.length === 0 && !loading ? (
						<div className="grid place-items-center rounded-xl border border-dashed border-border py-24 text-center">
							<div className="text-muted-foreground">No listings match.</div>
							<Annotation show={showInfra} className="mt-2">
								one Harper query · 0 rows
							</Annotation>
						</div>
					) : (
						<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
							{results.map((l) => (
								<ListingCard
									key={l.id}
									listing={l}
									showInfra={showInfra}
									onHover={setHoveredId}
									selected={hoveredId === l.id}
								/>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function CityTab({
	label,
	count,
	active,
	onClick,
}: {
	label: string;
	count?: number;
	active: boolean;
	onClick: () => void;
}) {
	return (
		<Button
			variant={active ? 'secondary' : 'ghost'}
			size="sm"
			onClick={onClick}
			className={cn('shrink-0 gap-1.5', !active && 'text-muted-foreground')}
		>
			{label}
			{count != null && <span className="mono text-xs text-muted-foreground">{count}</span>}
		</Button>
	);
}

function SortBtn({
	label,
	on,
	disabled,
	onClick,
}: {
	label: string;
	on: boolean;
	disabled?: boolean;
	onClick: () => void;
}) {
	return (
		<Button
			variant={on ? 'secondary' : 'ghost'}
			size="sm"
			disabled={disabled}
			onClick={onClick}
			className={cn('h-7 px-2.5 text-xs', !on && 'text-muted-foreground')}
		>
			{label}
		</Button>
	);
}
