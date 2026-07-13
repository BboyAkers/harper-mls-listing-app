import { cn } from '@/lib/utils';

/** A "// code comment" annotation — the app's device for tying UI to the runtime. */
export function Annotation({
	children,
	className,
	show = true,
}: {
	children: React.ReactNode;
	className?: string;
	show?: boolean;
}) {
	if (!show) return null;
	return <span className={cn('annotation', className)}>{`// ${children}`}</span>;
}

/**
 * An "X replaces Y" infra pill: the Harper capability, then the traditional
 * service it deletes, struck through.
 */
export function InfraPill({ has, replaces }: { has: string; replaces: string }) {
	return (
		<span className="mono inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs">
			<span className="text-foreground/90">{has}</span>
			<span className="text-annotation">·</span>
			<span className="text-strike line-through decoration-strike/70">{replaces}</span>
		</span>
	);
}
