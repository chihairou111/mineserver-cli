import React from 'react';
import {Box, Text, useApp} from 'ink';
import SelectInput from 'ink-select-input';

export type MenuItem<T extends string> = {label: string; value: T};

type WelcomeSelectorProps<T extends string> = {
	items: MenuItem<T>[];
	onSelect?: (value: T) => void;
};

export default function WelcomeSelector<T extends string>({items, onSelect}: WelcomeSelectorProps<T>) {
	const {exit} = useApp();

	const handleSelect = ({value}: MenuItem<T>) => {
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
