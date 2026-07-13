// Pluggable embedding provider.
//
// One function, `getEmbedding(text)`, used in two places: on write (embed a
// listing's description + features) and on read (embed the user's search
// phrase). The provider is config-driven:
//
//   • OPENAI_API_KEY set  → OpenAI text-embedding-3-small (best quality)
//   • otherwise           → a self-contained local hashing embedder (zero
//                           external dependencies, so the demo runs offline)
//
// The local embedder is a signed feature-hashing bag-of-words. It won't rival a
// real model, but it does capture shared vocabulary — "cozy craftsman bungalow"
// ranks craftsman-heavy descriptions above glass-and-steel condos — which is
// enough to demonstrate the HNSW vector index end to end.
//
// NOTE: all vectors in one deployment must share a dimension (the HNSW index is
// fixed at first insert). Switching providers means re-seeding. The local
// dimension is pinned here.

const LOCAL_DIM = 256;
const OPENAI_MODEL = 'text-embedding-3-small';

export const usingOpenAI = Boolean(process.env.OPENAI_API_KEY);

/** Provider name, for logging / the "which stack am I" story. */
export const embeddingProvider = usingOpenAI ? `openai:${OPENAI_MODEL}` : 'local:hashing';

/** Embed a piece of text into a unit-length vector. */
export async function getEmbedding(text: string): Promise<number[]> {
	const clean = (text ?? '').trim();
	if (!clean) return new Array(usingOpenAI ? 1536 : LOCAL_DIM).fill(0);
	return usingOpenAI ? openAIEmbedding(clean) : localEmbedding(clean);
}

// --- Local hashing embedder ---------------------------------------------------

function fnv1a(str: string): number {
	let h = 0x811c9dc5;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 0x01000193);
	}
	return h >>> 0;
}

function localEmbedding(text: string): number[] {
	const vec = new Array(LOCAL_DIM).fill(0);
	const tokens = text
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.split(/\s+/)
		.filter((t) => t.length > 1);

	for (const token of tokens) {
		const h = fnv1a(token);
		const bucket = h % LOCAL_DIM;
		const sign = (h >> 16) & 1 ? 1 : -1; // signed hashing reduces collisions
		vec[bucket] += sign;
	}

	// L2 normalize so cosine distance is well-behaved.
	const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
	return vec.map((v) => v / norm);
}

// --- OpenAI embedder ----------------------------------------------------------

async function openAIEmbedding(text: string): Promise<number[]> {
	const res = await fetch('https://api.openai.com/v1/embeddings', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
		},
		body: JSON.stringify({ model: OPENAI_MODEL, input: text, encoding_format: 'float' }),
	});
	if (!res.ok) {
		throw new Error(`OpenAI embeddings failed: ${res.status} ${await res.text()}`);
	}
	const data = (await res.json()) as { data: { embedding: number[] }[] };
	return data.data[0].embedding;
}
