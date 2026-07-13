import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

export type Tab = 'search' | 'saved' | 'agent';

export function TopNav({
	tab,
	onTab,
	showInfra,
	onToggleInfra,
	role,
	onToggleRole,
}: {
	tab: Tab;
	onTab: (t: Tab) => void;
	showInfra: boolean;
	onToggleInfra: () => void;
	role: 'buyer' | 'you';
	onToggleRole: () => void;
}) {
	return (
		<header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
			<div className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4 sm:px-6">
				{/* wordmark */}
				<div className="flex items-center gap-2">
					<span className="grid size-6 place-items-center rounded-md bg-primary/15 ring-1 ring-primary/40">
						<span className="size-2.5 rounded-[3px] bg-primary" />
					</span>
					<span className="text-[15px] font-semibold tracking-tight">harper</span>
					<span className="text-annotation">/</span>
					<span className="mono text-sm text-muted-foreground">listings</span>
				</div>

				{/* nav tabs */}
				<Tabs value={tab} onValueChange={(v) => onTab(v as Tab)}>
					<TabsList className="bg-transparent p-0">
						<TabsTrigger value="search" className="px-3">
							Search
						</TabsTrigger>
						<TabsTrigger value="saved" className="px-3">
							Saved searches
						</TabsTrigger>
						<TabsTrigger value="agent" className="px-3">
							Agent
						</TabsTrigger>
					</TabsList>
				</Tabs>

				<div className="ml-auto flex items-center gap-3">
					<Button
						variant="outline"
						size="sm"
						onClick={onToggleInfra}
						className={cn(
							'mono rounded-full text-xs',
							showInfra && 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
						)}
						title="Toggle infra annotations"
					>
						<span
							className={cn(
								'size-1.5 rounded-full',
								showInfra ? 'bg-primary shadow-[0_0_8px_var(--primary)]' : 'bg-muted-foreground',
							)}
						/>
						infra map
					</Button>

					<ToggleGroup
						type="single"
						value={role}
						onValueChange={(v) => v && v !== role && onToggleRole()}
						variant="outline"
						size="sm"
						className="rounded-full border border-border p-0.5"
					>
						<ToggleGroupItem value="buyer" className="rounded-full border-0 text-xs">
							Buyer
						</ToggleGroupItem>
						<ToggleGroupItem
							value="you"
							className="rounded-full border-0 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
						>
							You
						</ToggleGroupItem>
					</ToggleGroup>
				</div>
			</div>
		</header>
	);
}
