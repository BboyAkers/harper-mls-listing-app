import { App } from '@/App.tsx';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';

// The app is dark-first (matches the design system).
document.documentElement.classList.add('dark');

createRoot(
	document.getElementById('app')!,
).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
