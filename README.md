# Harper MLS Listings

A converged-stack reference app: **structured filters + geospatial search + semantic
search + native media + real-time alerts, in one Harper runtime.**

A real-estate search app is the canonical "I need four different systems" workload.
This one replaces all of them with a single Harper component — no external database,
cache, object store, search cluster, or API tier.

| Capability | Traditional stack | In this app |
| --- | --- | --- |
| Structured filters (price, beds, type) | Postgres | Harper table + `@indexed` |
| Geo queries (radius, map viewport) | PostGIS | Computed geohash + a Resource |
| Semantic search ("cozy craftsman near a park") | Elastic / pgvector / Pinecone | `@indexed(type: "HNSW")` |
| Listing photos | S3 + CDN | Harper native `Blob` |
| New-listing / price-drop alerts | Kafka + a worker | Harper Pub/Sub (SSE/WS/MQTT) |
| API layer | A Node/Express service | Auto REST + custom Resources |
| Front-end hosting | A separate deploy | Static served from the same instance |

The UI makes the thesis literal: an **infra-map** toggle tags each capability with the
system it deletes (`table + @indexed · Postgres`, `HNSW index · pgvector`, …, struck through).

## Architecture

```
mls-listings/
├── config.yaml              # rest, graphql schema, jsResource, vite, static
├── schemas/schema.graphql   # Listing / Agent / SavedSearch — indexes, HNSW, geohash
├── resources/
│   ├── Listing.ts           # extends the table: computed geohash + embed-on-write
│   ├── ListingSearch.ts     # hybrid structured + geo + semantic search (the money shot)
│   ├── ListingPhoto.ts      # serve/accept native Blob photos
│   ├── SavedSearchAlerts.ts # Resource-based Pub/Sub subscription (criteria matching)
│   └── Seed.ts              # loads data/seed.json (generates embeddings + hero photos)
├── lib/
│   ├── geohash.ts           # encode + neighbors
│   ├── haversine.ts         # exact distance refine
│   ├── bbox.ts              # radius → bounding box
│   └── embeddings.ts        # pluggable: local hashing (default) or OpenAI
├── data/seed.json           # 90 synthetic RESO-shaped Indianapolis-metro listings
├── scripts/generate-seed.mjs
└── src/                     # Vite + React 19 + shadcn/ui front-end
```

## Running it

Requires [Harper](https://docs.harperdb.io/docs/deployments/install-harper) (`npm i -g harper`) and Node 24.

```sh
npm install
npm run build      # build the React front-end into dist/
npm start          # harper run .  → http://localhost:9926
```

Open <http://localhost:9926>. On first load the UI seeds the database automatically;
you can also seed manually with `curl -X POST http://localhost:9926/Seed`.

> **Local auth:** these endpoints require a Harper `super_user`. For local development
> Harper auto-authorizes loopback requests when `authentication.authorizeLocal: true`
> in `~/harper/harper-config.yaml`. In production, enforce real auth and role checks.

### Dev-mode note

`npm run dev` (`harper dev`) runs a Vite HMR server that serves the SPA but does **not**
proxy the REST resources on the same port in this setup — use `npm start` (production
mode) to exercise the full stack, then rebuild (`npm run build`) after front-end edits.

## The API

Structured search comes free from the auto REST layer:

```sh
# active 3-bed homes under $500k in a city, cheapest first
curl -H 'Accept: application/json' \
  'http://localhost:9926/Listing/?status=active&beds=ge=3&listPrice=lt=500000&city=Fishers&sort(+listPrice)'

# amenity filter via the [String] array index
curl -H 'Accept: application/json' 'http://localhost:9926/Listing/?features=fireplace'
```

Hybrid search combines structured + geo + semantic in **one** request. Because a custom
resource can't take structured filters as query-string conditions, the parameters go in
the JSON **body**:

```sh
curl -X POST http://localhost:9926/ListingSearch \
  -H 'Content-Type: application/json' \
  -d '{"lat":39.9568,"lng":-86.0075,"radiusMi":5,"beds":3,"maxPrice":600000,
       "semantic":"cozy craftsman bungalow near a park"}'
```

- `semantic` embeds the phrase and ranks by HNSW vector proximity.
- `lat`/`lng`/`radiusMi` run a bounding-box prefilter (indexed lat/lng) then a haversine
  refine to a true radius, sorted by distance.
- Everything else (`beds`, `maxPrice`, `city`, `feature`, …) is an indexed condition.

Photos stream from native Blob storage: `GET /ListingPhoto/{id}`. Real-time changes come
off Harper's built-in table Pub/Sub — the web UI opens an `EventSource` on `/Listing/`
and surfaces new / price-dropped matches as toasts.

## Front-end

A Vite + React 19 app (shadcn/ui, Tailwind v4) served from the same origin: a semantic
search box, a filter rail, a grid of Blob-photo cards, an interactive map (open-source
**Leaflet** with CARTO/OpenStreetMap dark tiles — click anywhere to run a geo query:
viewport → bbox + haversine), an agent CRUD table, saved searches, and a live "new match"
toast. Dark, terminal-flavored, with the infra annotations that tie each piece of UI back
to the Harper primitive replacing a traditional service.

> The map is the one part that reaches outside Harper: Leaflet loads raster tiles from the
> public CARTO/OpenStreetMap CDN. Swap the `TileLayer` URL for any tile provider (or a
> self-hosted set) in `src/components/MapView.tsx`.

## Embeddings

`lib/embeddings.ts` exposes a single `getEmbedding(text)`. With no configuration it uses a
self-contained local hashing embedder (so the demo runs offline); set `OPENAI_API_KEY` to
switch to `text-embedding-3-small`. All vectors in a deployment must share a dimension, so
re-seed after switching providers.

## Deploy

```sh
npm run deploy     # harper deploy_component . restart=true replicated=true
```

Deploy to [Harper Fabric](https://fabric.harper.fast/) and replicate across regions near
your target metros — regional data, local read latency, one API answering from every
region.
