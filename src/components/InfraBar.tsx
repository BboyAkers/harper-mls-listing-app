import { InfraPill } from '@/components/Annotation';

const PILLS = [
	{ has: 'table + @indexed', replaces: 'Postgres' },
	{ has: 'geohash Resource', replaces: 'PostGIS' },
	{ has: 'HNSW index', replaces: 'pgvector' },
	{ has: 'native Blob', replaces: 'S3 + CDN' },
	{ has: 'Pub/Sub', replaces: 'Kafka' },
];

/** The thesis, made literal: one runtime deleting five boxes from the diagram. */
export function InfraBar({ show }: { show: boolean }) {
	if (!show) return null;
	return (
		<div className="border-b border-border/70 bg-background/60">
			<div className="mx-auto flex max-w-[1400px] items-center gap-3 overflow-x-auto px-4 py-2.5 sm:px-6">
				<span className="annotation shrink-0 whitespace-nowrap uppercase tracking-wider">
					{'// one harper runtime replaces'}
				</span>
				<div className="flex items-center gap-2">
					{PILLS.map((p) => (
						<InfraPill key={p.has} has={p.has} replaces={p.replaces} />
					))}
				</div>
			</div>
		</div>
	);
}
