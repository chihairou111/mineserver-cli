import React, {useState} from 'react';
import {Box, useApp} from 'ink';

import WelcomeSelector, {MenuValue} from './welcomeselector.js';
import NewInstance from './newinstance.js';

type Selection = MenuValue | 'welcome';

export default function WelcomeView() {
	const [selection, setSelection] = useState<Selection>('welcome');
	const {exit} = useApp();

	const handleSelect = (value: MenuValue) => {
		switch (value) {
			case 'create':
				setSelection(value);
				break;
			case 'use':
				setSelection(value);
				break;
			case 'help':
				setSelection(value);
				break;
			case 'quit':
				exit();
				break;
			default:
				break;
		}
	};

	return (
		<Box>
			{selection === 'welcome' && <WelcomeSelector onSelect={handleSelect} />}
			{selection === 'create' && <NewInstance />}
			{selection === 'use' && <WelcomeSelector onSelect={handleSelect} />}
			{selection === 'help' && <WelcomeSelector onSelect={handleSelect} />}
		</Box>
	);
}
