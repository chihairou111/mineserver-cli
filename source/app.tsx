// node dist/cli.js
import React from 'react';
import WelcomePage from './welcomepage.js';
import { StringProvider } from './ctx.js';

export default function App() {
	return (
		<StringProvider>
			<WelcomePage />
		</StringProvider>
	);
}
