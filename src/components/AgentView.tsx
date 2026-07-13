import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Annotation } from '@/components/Annotation';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { createListing, deleteListing, search, updateListingStatus, type Listing } from '@/lib/api';
import { formatPrice, metaLine } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_CYCLE = ['active', 'pending', 'sold'];
const STATUS_STYLES: Record<string, string> = {
	active: 'bg-primary/15 text-primary',
	pending: 'bg-amber-500/15 text-amber-400',
	sold: 'bg-muted text-muted-foreground',
};
const TYPES = ['single-family', 'condo', 'townhouse', 'multi-family'];

export function AgentView({ showInfra }: { showInfra: boolean }) {
	const [listings, setListings] = useState<Listing[]>([]);
	const [loading, setLoading] = useState(true);
	const [open, setOpen] = useState(false);

	async function load() {
		setLoading(true);
		const res = await search({ status: 'any', sort: 'newest', limit: 40 });
		setListings(res.results);
		setLoading(false);
	}
	useEffect(() => {
		load();
	}, []);

	async function cycleStatus(l: Listing) {
		const next = STATUS_CYCLE[(STATUS_CYCLE.indexOf(l.status) + 1) % STATUS_CYCLE.length];
		setListings((prev) => prev.map((x) => (x.id === l.id ? { ...x, status: next } : x)));
		await updateListingStatus(l.id, next);
	}

	async function remove(l: Listing) {
		setListings((prev) => prev.filter((x) => x.id !== l.id));
		await deleteListing(l.id);
	}

	return (
		<div className="mx-auto max-w-[1000px] px-4 py-8 sm:px-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">Agent · manage listings</h2>
					<Annotation show={showInfra} className="mt-1 block">
						auto REST CRUD on the Listing table · POST/PATCH/DELETE
					</Annotation>
				</div>
				<Dialog open={open} onOpenChange={setOpen}>
					<DialogTrigger asChild>
						<Button>
							<Plus className="size-4" /> New listing
						</Button>
					</DialogTrigger>
					<AddListingDialog onDone={() => { setOpen(false); load(); }} showInfra={showInfra} />
				</Dialog>
			</div>

			<div className="mt-6 overflow-hidden rounded-xl border border-border">
				{loading ? (
					<div className="flex justify-center py-16">
						<Loader2 className="size-5 animate-spin text-primary" />
					</div>
				) : (
					<TooltipProvider delayDuration={200}>
						<Table>
							<TableHeader>
								<TableRow className="bg-card/60 hover:bg-card/60">
									<TableHead>Address</TableHead>
									<TableHead>Price</TableHead>
									<TableHead className="hidden sm:table-cell">Details</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="w-10" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{listings.map((l) => (
									<TableRow key={l.id}>
										<TableCell>
											<div className="font-medium">{l.addressLine}</div>
											<div className="text-xs text-muted-foreground">
												{l.city}, {l.state}
											</div>
										</TableCell>
										<TableCell className="font-medium">{formatPrice(l.listPrice)}</TableCell>
										<TableCell className="mono hidden text-xs text-muted-foreground sm:table-cell">
											{metaLine(l)}
										</TableCell>
										<TableCell>
											<Tooltip>
												<TooltipTrigger asChild>
													<button
														onClick={() => cycleStatus(l)}
														className={cn(
															'rounded-full px-2.5 py-0.5 text-xs font-medium capitalize transition-colors',
															STATUS_STYLES[l.status] ?? STATUS_STYLES.sold,
														)}
													>
														{l.status}
													</button>
												</TooltipTrigger>
												<TooltipContent>click to cycle status → PATCH /Listing</TooltipContent>
											</Tooltip>
										</TableCell>
										<TableCell className="text-right">
											<Button
												variant="ghost"
												size="icon"
												className="size-8 text-muted-foreground hover:text-destructive"
												onClick={() => remove(l)}
											>
												<Trash2 className="size-4" />
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TooltipProvider>
				)}
			</div>
		</div>
	);
}

function AddListingDialog({ onDone, showInfra }: { onDone: () => void; showInfra: boolean }) {
	const [f, setF] = useState({
		addressLine: '',
		city: 'Fishers',
		state: 'IN',
		zip: '46037',
		listPrice: '450000',
		beds: '3',
		baths: '2',
		sqft: '2000',
		propertyType: 'single-family',
		description: 'A bright, welcoming home with an open floor plan and a private backyard.',
		lat: '39.9568',
		lng: '-86.0075',
	});
	const [saving, setSaving] = useState(false);

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		setSaving(true);
		await createListing({
			id: `mls-${Math.floor(Math.random() * 900000 + 100000)}`,
			mlsId: `IN${Math.floor(Math.random() * 90000 + 10000)}`,
			status: 'active',
			addressLine: f.addressLine || 'New Listing',
			city: f.city,
			state: f.state,
			zip: f.zip,
			listPrice: Number(f.listPrice),
			beds: Number(f.beds),
			baths: Number(f.baths),
			sqft: Number(f.sqft),
			propertyType: f.propertyType,
			description: f.description,
			features: [],
			lat: Number(f.lat),
			lng: Number(f.lng),
		});
		setSaving(false);
		onDone();
	}

	const field = (key: keyof typeof f, label: string, props: React.ComponentProps<'input'> = {}) => (
		<div className="flex flex-col gap-1.5">
			<Label className="text-xs text-muted-foreground">{label}</Label>
			<Input value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} {...props} />
		</div>
	);

	return (
		<DialogContent className="max-w-2xl">
			<DialogHeader>
				<DialogTitle>Publish a listing</DialogTitle>
				<DialogDescription>
					Creates a row via <span className="mono">POST /Listing</span>.
					<Annotation show={showInfra} className="ml-1">
						embed-on-write generates the HNSW vector automatically
					</Annotation>
				</DialogDescription>
			</DialogHeader>

			<form onSubmit={submit} className="grid gap-3">
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
					{field('addressLine', 'Address', { className: 'col-span-2 sm:col-span-3' })}
					{field('city', 'City')}
					{field('state', 'State')}
					{field('zip', 'Zip')}
					{field('listPrice', 'Price', { type: 'number' })}
					{field('beds', 'Beds', { type: 'number' })}
					{field('baths', 'Baths', { type: 'number' })}
					{field('sqft', 'Sqft', { type: 'number' })}
					<div className="flex flex-col gap-1.5">
						<Label className="text-xs text-muted-foreground">Type</Label>
						<Select value={f.propertyType} onValueChange={(v) => setF({ ...f, propertyType: v })}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{TYPES.map((t) => (
									<SelectItem key={t} value={t} className="capitalize">
										{t.replace('-', ' ')}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="col-span-2 flex flex-col gap-1.5 sm:col-span-3">
						<Label className="text-xs text-muted-foreground">Description (semantically indexed)</Label>
						<Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
					</div>
				</div>
				<DialogFooter>
					<Button type="button" variant="ghost" onClick={onDone}>
						Cancel
					</Button>
					<Button type="submit" disabled={saving}>
						{saving && <Loader2 className="size-4 animate-spin" />} Publish listing
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);
}
