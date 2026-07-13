import type { SearchParams } from '@/lib/api';

export interface SavedSearch {
	id: string;
	label: string;
	params: SearchParams;
}

const KEY = 'harper-mls-saved-searches';

export function loadSaved(): SavedSearch[] {
	try {
		return JSON.parse(localStorage.getItem(KEY) ?? '[]');
	} catch {
		return [];
	}
}

export function saveAll(list: SavedSearch[]) {
	localStorage.setItem(KEY, JSON.stringify(list));
}

export function addSaved(label: string, params: SearchParams): SavedSearch[] {
	const list = loadSaved();
	const entry: SavedSearch = { id: `ss-${Date.now()}`, label, params };
	const next = [entry, ...list];
	saveAll(next);
	return next;
}

export function removeSaved(id: string): SavedSearch[] {
	const next = loadSaved().filter((s) => s.id !== id);
	saveAll(next);
	return next;
}
