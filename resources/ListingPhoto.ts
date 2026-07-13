// ListingPhoto — serve (and accept) listing photos straight from Harper's
// native Blob storage (§7). No S3 bucket, no CDN, no separate file service:
// the bytes live in the same table as the structured data and stream from the
// same origin as the API.
//
//   GET  /ListingPhoto/{id}        → hero photo
//   GET  /ListingPhoto/{id}?i=2    → the 3rd gallery photo
//   PUT  /ListingPhoto/{id}        { "data": "<base64>", "contentType": "image/jpeg" }

import { Resource, tables, createBlob } from 'harper';
import type { RequestTarget } from 'harper';

interface Blobish {
	type?: string;
	bytes(): Promise<Uint8Array>;
}

interface ListingWithPhotos {
	heroPhoto?: Blobish;
	photos?: Blobish[];
}

export class ListingPhoto extends Resource {
	static loadAsInstance = false;

	async get(target: RequestTarget) {
		const id = target.id as string;
		if (!id) return new Response('Listing id required', { status: 400 });

		const listing = (await tables.Listing.get(id)) as ListingWithPhotos | undefined;
		if (!listing) return new Response('Not found', { status: 404 });

		const index = target.get('i');
		const blob =
			index != null && index !== ''
				? listing.photos?.[Number(index)]
				: listing.heroPhoto;

		if (!blob) return new Response('No photo', { status: 404 });

		return {
			status: 200,
			headers: {
				'Content-Type': blob.type || 'image/jpeg',
				'Cache-Control': 'public, max-age=86400',
			},
			body: blob,
		};
	}

	async put(target: RequestTarget, data: { data?: string; encoding?: string; contentType?: string }) {
		const id = target.id as string;
		if (!id) return new Response('Listing id required', { status: 400 });
		if (!data?.data) return new Response('base64 `data` required', { status: 400 });

		const blob = createBlob(Buffer.from(data.data, (data.encoding as BufferEncoding) || 'base64'), {
			type: data.contentType || 'image/jpeg',
		});
		await tables.Listing.patch(id, { heroPhoto: blob } as never);
		return { ok: true, id };
	}
}
