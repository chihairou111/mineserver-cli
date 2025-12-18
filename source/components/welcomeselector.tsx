import React from 'react';
import {Box, Text, useApp} from 'ink';
import SelectInput from 'ink-select-input';

export type MenuValue = 'create' | 'use' | 'help' | 'quit';
type MenuItem = {label: string; value: MenuValue};

type WelcomeSelectorProps = {
	onSelect?: (value: MenuValue) => void;
};

const items: MenuItem[] = [
	{label: 'Create a new instance', value: 'create'},
	{label: 'Use an existing instance', value: 'use'},
	{label: 'Help', value: 'help'},
	{label: 'Quit', value: 'quit'},
];

export default function WelcomeSelector({onSelect}: WelcomeSelectorProps) {
	const {exit} = useApp();

	const handleSelect = ({value}: MenuItem) => {
		onSelect?.(value);

		if (value === 'quit') {
			exit();
		}
	};

	return (
		<Box flexDirection="column" gap={1}>
			<Box flexDirection="column" alignItems="flex-start" gap={0.5}>
				<Text color="green" bold>
					Welcome to Mineserver CLI
				</Text>
				<Text color="gray">
					The industry-leading Minecraft server management tool.
				</Text>
			</Box>
			<Box flexDirection="column" gap={1}>
				<SelectInput items={items} onSelect={handleSelect} />
				<Text color="gray">Use ↑/↓ then Enter.</Text>
			</Box>
		</Box>
	);
}
