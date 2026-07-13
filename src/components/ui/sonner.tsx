import { Toaster as Sonner, type ToasterProps } from 'sonner';

// Dark, terminal-flavored toasts wired to the app's design tokens.
function Toaster(props: ToasterProps) {
	return (
		<Sonner
			theme="dark"
			position="bottom-right"
			style={
				{
					'--normal-bg': 'var(--card)',
					'--normal-text': 'var(--foreground)',
					'--normal-border': 'var(--border)',
				} as React.CSSProperties
			}
			{...props}
		/>
	);
}

export { Toaster };
