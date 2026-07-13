// Generates data/seed.json — synthetic, RESO-shaped listings distributed across
// the Indianapolis metro. Deterministic (seeded PRNG) so the committed file is
// stable. Embeddings and hero photos are NOT stored here; they are generated
// server-side when the Seed resource loads this file, so the media + vector
// phases stay self-contained.
//
//   node scripts/generate-seed.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'data', 'seed.json');

// --- deterministic PRNG -------------------------------------------------------
function mulberry32(seed) {
	return function () {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
const rand = mulberry32(20260713);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const rint = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const chance = (p) => rand() < p;

// --- geography ----------------------------------------------------------------
const NEIGHBORHOODS = [
	{ city: 'Fishers', zip: '46037', lat: 39.9568, lng: -86.0075, tier: 'suburb' },
	{ city: 'Carmel', zip: '46032', lat: 39.9784, lng: -86.118, tier: 'affluent' },
	{ city: 'Zionsville', zip: '46077', lat: 39.9509, lng: -86.2619, tier: 'affluent' },
	{ city: 'Westfield', zip: '46074', lat: 40.0428, lng: -86.1275, tier: 'suburb' },
	{ city: 'Noblesville', zip: '46060', lat: 40.0456, lng: -86.0086, tier: 'suburb' },
	{ city: 'Indianapolis', zip: '46220', lat: 39.8698, lng: -86.1436, tier: 'urban' }, // Broad Ripple
	{ city: 'Indianapolis', zip: '46204', lat: 39.7684, lng: -86.1581, tier: 'downtown' },
	{ city: 'Greenwood', zip: '46142', lat: 39.6137, lng: -86.1067, tier: 'suburb' },
];

const STREETS = [
	'Maple', 'Oak', 'Sycamore', 'Cumberland', 'Lantern', 'Brookview', 'Wellington',
	'Copperfield', 'Harmony', 'Sunblest', 'Eller', 'Allisonville', 'Ironwood',
	'Meridian', 'Riverwood', 'Cool Creek', 'Village', 'Fairbanks', 'Windermere', 'Cedar',
];
const SUFFIX = ['Ln', 'Dr', 'Ct', 'Way', 'Blvd', 'St', 'Trl', 'Pkwy'];

// --- style archetypes: drive description + features + price/size skew ---------
const ARCHETYPES = [
	{
		key: 'craftsman',
		propertyType: 'single-family',
		blurb:
			'A cozy craftsman bungalow with warm wood built-ins, a covered front porch, and a shady, tree-lined lot. Quiet street, walkable to the neighborhood park.',
		features: ['front porch', 'hardwood floors', 'fireplace', 'built-ins', 'mature trees'],
		yearRange: [1918, 1948],
		sqftRange: [1400, 2200],
	},
	{
		key: 'midcentury-ranch',
		propertyType: 'single-family',
		blurb:
			'A clean mid-century ranch on a generous single-story footprint. Low-slung rooflines, original terrazzo, and walls of glass opening to a private backyard.',
		features: ['single story', 'large windows', 'attached garage', 'patio', 'open floor plan'],
		yearRange: [1955, 1972],
		sqftRange: [1500, 2400],
	},
	{
		key: 'modern-new',
		propertyType: 'single-family',
		blurb:
			'A sleek, newly built modern home with an open great room, quartz waterfall island, black-framed windows, and a smart-home package throughout.',
		features: ['smart home', 'quartz counters', 'open floor plan', 'ev charger', 'energy efficient'],
		yearRange: [2019, 2025],
		sqftRange: [2600, 4200],
	},
	{
		key: 'colonial-family',
		propertyType: 'single-family',
		blurb:
			'A spacious two-story colonial perfect for a growing family — formal dining, a big fenced yard, a three-car garage, and top-rated schools nearby.',
		features: ['fenced yard', 'three car garage', 'basement', 'formal dining', 'cul-de-sac'],
		yearRange: [1995, 2015],
		sqftRange: [2800, 4500],
	},
	{
		key: 'downtown-loft',
		propertyType: 'condo',
		blurb:
			'An industrial downtown loft with exposed brick, soaring ceilings, polished concrete floors, and skyline views steps from restaurants and the arts district.',
		features: ['exposed brick', 'city views', 'secured entry', 'rooftop deck', 'walkable'],
		yearRange: [2005, 2021],
		sqftRange: [900, 1600],
	},
	{
		key: 'townhouse',
		propertyType: 'townhouse',
		blurb:
			'A low-maintenance townhouse with a two-car garage, sunny end-unit exposure, and an HOA that handles the lawn and snow. Move-in ready.',
		features: ['end unit', 'two car garage', 'low maintenance', 'community pool', 'patio'],
		yearRange: [2008, 2022],
		sqftRange: [1300, 2100],
	},
	{
		key: 'lakefront',
		propertyType: 'single-family',
		blurb:
			'A serene lakefront retreat with a private dock, walls of windows facing the water, a screened porch, and sunset views over a quiet cove.',
		features: ['waterfront', 'private dock', 'screened porch', 'vaulted ceilings', 'fireplace'],
		yearRange: [1988, 2016],
		sqftRange: [2400, 4000],
	},
	{
		key: 'multi-family',
		propertyType: 'multi-family',
		blurb:
			'A well-kept duplex with separately metered units, long-term tenants, and strong rental history — an easy addition to an investment portfolio.',
		features: ['separate meters', 'off street parking', 'rental income', 'basement', 'updated roof'],
		yearRange: [1960, 2000],
		sqftRange: [2000, 3200],
	},
];

const TIER_PRICE = {
	downtown: [239000, 620000],
	urban: [285000, 720000],
	suburb: [265000, 700000],
	affluent: [420000, 1450000],
};

const AGENTS = [
	{ name: 'Dana Whitfield', brokerage: 'Crossroads Realty Group' },
	{ name: 'Marcus Bell', brokerage: 'Circle City Homes' },
	{ name: 'Priya Nair', brokerage: 'Meridian & Main Real Estate' },
	{ name: 'Tom Kowalski', brokerage: 'Hoosier Heartland Realty' },
	{ name: 'Alicia Romero', brokerage: 'White River Properties' },
	{ name: 'Sam Okafor', brokerage: 'Keystone Realty Partners' },
].map((a, i) => ({
	id: `agent-${i + 1}`,
	...a,
	email: `${a.name.split(' ')[0].toLowerCase()}@${a.brokerage.split(' ')[0].toLowerCase()}.example`,
	phone: `317-555-${String(rint(1000, 9999))}`,
}));

const STATUSES = ['active', 'active', 'active', 'active', 'pending', 'sold'];

function jitter(base, milesRadius) {
	// ~0.0145 deg lat per mile; scatter within the neighborhood
	const dLat = (rand() - 0.5) * 2 * (milesRadius / 69);
	const dLng = (rand() - 0.5) * 2 * (milesRadius / 53);
	return [base + dLat, dLng];
}

const listings = [];
const COUNT = 90;
for (let i = 0; i < COUNT; i++) {
	const hood = pick(NEIGHBORHOODS);
	const arch = pick(ARCHETYPES);
	const [lat, dLng] = jitter(hood.lat, 2.5);
	const lng = hood.lng + dLng - (dLng - (rand() - 0.5) * 2 * (2.5 / 53));

	const [pMin, pMax] = TIER_PRICE[hood.tier];
	const sqft = rint(arch.sqftRange[0], arch.sqftRange[1]);
	// price loosely tracks size + tier, with noise
	let listPrice = Math.round((pMin + (pMax - pMin) * ((sqft - 900) / 3600)) * (0.85 + rand() * 0.35));
	listPrice = Math.round(listPrice / 1000) * 1000;

	const beds = arch.propertyType === 'condo' ? rint(1, 2) : rint(2, 5);
	const baths = Math.min(beds, arch.propertyType === 'condo' ? rint(1, 2) : rint(1, 4)) + (chance(0.5) ? 0.5 : 0);
	const yearBuilt = rint(arch.yearRange[0], arch.yearRange[1]);

	// a couple of extra rotating features for variety
	const extra = pick([
		'updated kitchen', 'new hvac', 'finished basement', 'solar panels',
		'home office', 'garden beds', 'wet bar', 'walk-in closet', 'heated floors',
	]);
	const features = [...new Set([...arch.features, extra])];

	listings.push({
		id: `mls-${1000 + i}`,
		mlsId: `IN${21000 + i}`,
		status: pick(STATUSES),
		listPrice,
		beds,
		baths,
		sqft,
		propertyType: arch.propertyType,
		yearBuilt,
		addressLine: `${rint(100, 9899)} ${pick(STREETS)} ${pick(SUFFIX)}`,
		city: hood.city,
		state: 'IN',
		zip: hood.zip,
		lat: Math.round(lat * 1e6) / 1e6,
		lng: Math.round(lng * 1e6) / 1e6,
		description: arch.blurb,
		features,
		style: arch.key,
		agentId: pick(AGENTS).id,
	});
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ agents: AGENTS, listings }, null, '\t'));
console.log(`Wrote ${listings.length} listings and ${AGENTS.length} agents to ${OUT}`);
