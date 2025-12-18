import React, {useState} from 'react';
import {Box, Text, useStdout, useInput} from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';

import { AutoGrid } from './ui/autogrid.js';
import { downloadServer } from '../utils/downloadserver.js';

type MenuValue = {label: string; value: string};

interface vanillaVersion {
	id: string,
	type: string
	url: URL
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
	const [isDownloading, setIsDownloading] = useState<boolean>(false)
	const [downloadError, setDownloadError] = useState<string | null>(null)
	const [selectedVersion, setSelectedVersion] = useState<vanillaVersion | undefined>()
	const [canRetry, setCanRetry] = useState<boolean>(false)
	const width = stdout?.columns ?? 80;
	const maxDownloadRetries = 3;

	useInput((input) => {
		if (!canRetry || isDownloading) return;

		if (input === 'y' && selectedVersion) {
			void downloadWithRetry(selectedVersion)
		}
		if (input === 'n') {
			setCanRetry(false);
			setStage(2);
		}
	})

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

	const handleVanillaVersionSelect = async (item: string) => {
		if (vanillaList) {
			const version = vanillaList.versions.find(v => v.id === item)
			setSelectedVersion(version)
			if (!version) return;

			setDownloadError(null)
			setCanRetry(false)
			setStage(3)
			void downloadWithRetry(version)
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

	async function downloadWithRetry(version: vanillaVersion) {
		setIsDownloading(true)
		setDownloadError(null)

		let lastError: string | null = null

		for (let attempt = 1; attempt <= maxDownloadRetries; attempt++) {
			try {
				await downloadServer(version.url, version.id, version.type)
				lastError = null
				break
			} catch (err) {
				lastError = err instanceof Error ? err.message : 'Download failed'
				if (attempt === maxDownloadRetries) {
					setDownloadError(`Download failed after ${attempt} tries: ${lastError}`)
				}
			}
		}

		if (lastError) {
			setCanRetry(true)
		} else {
			setCanRetry(false)
		}

		setIsDownloading(false)
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
				{/* Stage 3 */}
				{stage === 3 && (
					<>
						<Box gap={0.5} flexDirection='column'>
							<Text>Instance name: {name}</Text>
							<Text>Type: {type?.label}</Text>
							<Text>Version: {selectedVersion?.id}</Text>
						</Box>
						{isDownloading && (
							<>
								<Box flexDirection='row'>
									<Text>Downloading... </Text>
									<Spinner type='dots' />
								</Box>
							</>
						)}
						{!isDownloading && downloadError && (
							<>
								<Box flexDirection='column'>
									<Text color='red'>{downloadError}</Text>
									<Text>{"Retry? (y/n)"}</Text>
								</Box>
							</>
						)}
						{!isDownloading && !downloadError && (
							<Text color="green">Download completed.</Text>
						)}
					</>
				)}
		</Box>
	);
}
