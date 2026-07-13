import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { AgentView } from '@/components/AgentView';
import { AlertCard } from '@/components/AlertToast';
import { InfraBar } from '@/components/InfraBar';
import { SavedSearchesView } from '@/components/SavedSearchesView';
import { SearchView } from '@/components/SearchView';
import { TopNav, type Tab } from '@/components/TopNav';
import { Toaster } from '@/components/ui/sonner';
import { getSeedStatus, openListingStream, seed, type Listing, type SearchParams } from '@/lib/api';
import { addSaved, loadSaved, removeSaved, type SavedSearch } from '@/lib/savedSearches';

function matchesCriteria(l: Listing, c: SearchParams): boolean {
	if (c.maxPrice != null && l.listPrice > c.maxPrice) return false;
	if (c.minPrice != null && l.listPrice < c.minPrice) return false;
	if (c.beds != null && (l.beds ?? 0) < c.beds) return false;
	if (c.city && l.city !== c.city) return false;
	if (c.propertyType && l.propertyType !== c.propertyType) return false;
	if (c.feature && !(l.features ?? []).includes(c.feature)) return false;
	return true;
}

export function App() {
	const [tab, setTab] = useState<Tab>('search');
	const [showInfra, setShowInfra] = useState(true);
	const [role, setRole] = useState<'buyer' | 'you'>('you');
	const [ready, setReady] = useState(false);
	const [saved, setSaved] = useState<SavedSearch[]>([]);

	// boot: ensure there is seed data, then load saved searches
	useEffect(() => {
		(async () => {
			try {
				const status = await getSeedStatus();
				if (!status.listings) await seed();
			} catch {
				/* ignore — server may still be warming up */
			}
			setSaved(loadSaved());
			setReady(true);
		})();
	}, []);

	// live alerts via Harper's built-in table Pub/Sub (SSE), surfaced as sonner toasts
	useEffect(() => {
		if (!ready) return;
		const close = openListingStream((e) => {
			const matched = saved.length ? saved.some((s) => matchesCriteria(e.listing, s.params)) : true;
			if (!matched) return;
			const kind = e.kind === 'update' ? 'price drop' : 'new listing';
			toast.custom(
				(id) => <AlertCard kind={kind} listing={e.listing} showInfra={showInfra} onDismiss={() => toast.dismiss(id)} />,
				{ duration: 12000 },
			);
		});
		return close;
	}, [ready, saved, showInfra]);

	function handleSaveSearch(params: SearchParams, label: string) {
		setSaved(addSaved(label, params));
		setTab('saved');
	}

	return (
		<div className="min-h-screen">
			<TopNav
				tab={tab}
				onTab={setTab}
				showInfra={showInfra}
				onToggleInfra={() => setShowInfra((v) => !v)}
				role={role}
				onToggleRole={() => setRole((r) => (r === 'buyer' ? 'you' : 'buyer'))}
			/>
			<InfraBar show={showInfra} />

			{!ready ? (
				<div className="grid place-items-center py-40 text-muted-foreground">
					<div className="mono text-sm">booting harper runtime…</div>
				</div>
			) : tab === 'search' ? (
				<SearchView showInfra={showInfra} onSaveSearch={handleSaveSearch} />
			) : tab === 'saved' ? (
				<SavedSearchesView saved={saved} onRemove={(id) => setSaved(removeSaved(id))} showInfra={showInfra} />
			) : (
				<AgentView showInfra={showInfra} />
			)}

			<Toaster />
		</div>
	);
}
