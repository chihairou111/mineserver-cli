import React, {useState} from 'react';
import {Box, Text, useStdout} from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';

import { AutoGrid } from './ui/autogrid.js';

type MenuValue = {label: string; value: string};

interface vanillaVersion {
	id: string,
	type: string
}

interface vanillaList {
	versions: vanillaVersion[]
}

export default function NewInstance() {
	const { stdout } = useStdout();
	const [name, setName] = useState<string>('');
	const [type, setType] = useState<MenuValue | null>();
	const [stage, setStage] = useState<number>(0);
	const [isNameNull, setIsNameNull] = useState<boolean>(false)
	const [vanillaList, setVanillaList] = useState<vanillaList | null>(null)
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const [selectedVersion, setSelectedVersion] = useState<vanillaVersion | undefined>()
	const width = stdout?.columns ?? 80;

	const typeList: MenuValue[] = [
		{
			label: 'Vanilla',
			value: 'vanilla'
		},
		{
			label: 'Mod',
			value: 'mod'
		},
		{
			label: 'Plugin',
			value: 'plugin'
		},
		{
			label: 'Mod + Plugin',
			value: 'modnplugin'
		},
	];

	const handleTypeSelect = (selectedType: MenuValue) => {
		setType(selectedType);
		if (selectedType.value === 'vanilla') {
			fetchVanilla()
		}
		if (selectedType.value === 'mod') {
			//TODO
		}
		if (selectedType.value === 'plugin') {
			//TODO
		}
		if (selectedType.value === 'modnplugin') {
			//TODO
		}
	};

	const handleVanillaVersionSelect = (item: string) => {
		if (vanillaList) {
			setSelectedVersion(vanillaList.versions.find(version => version.id === item))
			console.log(selectedVersion)
		}
	}

	// Vanilla

	async function fetchVanilla() {
		setIsLoading(true)
		const res = await fetch(
			"https://launchermeta.mojang.com/mc/game/version_manifest.json"
		)
		const data: vanillaList = await res.json()
		setVanillaList({
			versions: data.versions.filter(version => version.type === 'release')
		})
		setIsLoading(false)
		setStage(2);
	}

	return (
			<Box gap={2} flexDirection='column'>
				{/* Stage 0 */}
				{stage === 0 && (
					<>
						<Text color="blue" bold>Create new instance</Text>
						<Box gap={1} flexDirection='column' paddingX={1} paddingY={1}>
							<Text color="white">
								1. Instance name:
							</Text>
							<Box flexDirection='row' gap={1}>
								<Text color="gray">{'>'}</Text>
							<TextInput value={name} onChange={setName} onSubmit={(value) => {
								if (!value) {
									setIsNameNull(true);
									return;
								}
								setIsNameNull(false);
								setName(value);
								setStage(1);
							}}/>
						</Box>
						{(isNameNull) && <Text color="red">Name is null.</Text>}
					</Box>
				</>
			)}
				{/* Stage 1 */}
				{stage === 1 && (
					<>
						<Text>Instance name: {name}</Text>
						<Text color="blue" bold>2. Select Type</Text>
						<Box paddingX={1} paddingY={1} gap={1}>
							<SelectInput items={typeList} onSelect={handleTypeSelect} />
							<Text color="gray">Choose the base stack for your server.</Text>
						</Box>
						{(isLoading) && <Spinner type='dots' />}
					</>
				)}
				{/* Stage 2 */}
				{stage === 2 && (
					<>
						<Box gap={0.5} flexDirection='column'>
							<Text>Instance name: {name}</Text>
							<Text>Type: {type?.label}</Text>
						</Box>
						{type?.value === 'vanilla' && (
							<Box gap={1} flexDirection='column'>
								<Text color="gray">Select version</Text>
								<AutoGrid
									items={vanillaList?.versions.map(version => version.id) || []}
									width={width}
									onSelect={handleVanillaVersionSelect}
								/>
							</Box>
						)}
						{type?.value === 'mod' && (
							<Text color="gray">Select mod loader (coming soon)</Text>
						)}
						{type?.value === 'plugin' && (
							<Text color="gray">Select plugin platform (coming soon)</Text>
						)}
						{type?.value === 'modnplugin' && (
							<Text color="gray">Select mod loader and plugin platform (coming soon)</Text>
						)}
					</>
				)}
		</Box>
	);
}
