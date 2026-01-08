import React, {useState} from "react";
import { Box, Text, useStdout, useApp, useInput } from "ink";
import BigText from "ink-big-text";
import Gradient from "ink-gradient";

import WelcomeSelector, {MenuItem} from "./components/welcomeselector.js";
import NewInstance from "./components/newinstance.js";
import UseInstance from "./components/useinstance/_useinstance.js";
import { useString } from "./ctx.js";

type MenuValue = 'create' | 'use' | 'help' | 'quit';
type Selection = MenuValue | 'welcome';

export default function WelcomePage() {

	const { stdout } = useStdout();
	const { exit } = useApp();
	const { lastPage, setLastPage } = useString();
	const [selection, setSelection] = useState<Selection>((lastPage as Selection) || 'welcome');

	const menuItems: MenuItem<MenuValue>[] = [
		{label: 'Create a new instance', value: 'create'},
		{label: 'Use an existing instance', value: 'use'},
		{label: 'Help', value: 'help'},
		{label: 'Quit', value: 'quit'},
	];

	const handleSelect = (value: MenuValue) => {
		if (value === 'quit') {
			return exit();
		}

		setSelection(value);
		setLastPage('welcome');
	};
	
	const isWelcome = selection === 'welcome';
	const subtitle = isWelcome
		? 'Arrow keys to navigate, Enter to select.'
		: (
			({
				create: 'Create a new instance',
				use: 'Use an existing instance',
				help: 'Help & docs',
				quit: 'Quit'
			} satisfies Record<MenuValue, string>)[selection as MenuValue] ?? ''
		);

	useInput((_, key) => {
		if (!isWelcome && key.escape) {
			setSelection('welcome');
			setLastPage('welcome');
		}
	});

	const header = isWelcome ? (
		<>
			<Gradient name="cristal">
				<BigText text="MINESERVER" />
			</Gradient>
			<Text color="gray">{subtitle}</Text>
		</>
	) : (
		<Box flexDirection="column" gap={0.5}>
			<Text color="cyan" bold>MINESERVER</Text>
			<Text color="gray">{subtitle}</Text>
			<Text color="gray">Press Esc to go back</Text>
		</Box>
	);

	return (
		<Box
			width={stdout?.columns}
			paddingX={2}
			paddingY={isWelcome ? 2 : 1}
			borderStyle={isWelcome ? 'double' : 'round'}
			borderColor="cyan"
			flexDirection="column"
			justifyContent="flex-start"
			alignItems="flex-start"
			gap={isWelcome ? 2 : 1}
		>
			{header}
			{selection === 'welcome' && (
				<WelcomeSelector<MenuValue>
					items={menuItems}
					onSelect={handleSelect}
				/>
			)}
			{selection === 'create' && <NewInstance />}
			{selection === 'use' && <UseInstance />}
			{selection === 'help' && <Text color="gray">Help (coming soon)</Text>}
		</Box>
    )
}
