import React, {useState} from 'react';
import {Box, Text, useStdout, useInput, Newline} from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';

import { AutoGrid } from './ui/autogrid.js';
import { downloadServer } from '../utils/downloadserver.js';

type MenuValue = {label: string; value: string};


// Vanilla
interface vanillaVersion {
	id: string,
	type: string,
	url: URL
}

interface vanillaList {
	versions: vanillaVersion[]
}

// Fabric

interface fabricVersion {
	version: string,
	stable: boolean,
	url?: URL
}



export default function NewInstance() {
	const { stdout } = useStdout();
	const [name, setName] = useState<string>('');
	const [type, setType] = useState<MenuValue | null>();
	const [stage, setStage] = useState<number>(0);
	const [isNameNull, setIsNameNull] = useState<boolean>(false)
	const [isLoading, setIsLoading] = useState<boolean>(false)
	const [isDownloading, setIsDownloading] = useState<boolean>(false)
	const [downloadError, setDownloadError] = useState<string | null>(null)
	const [selectedVersion, setSelectedVersion] = useState<string>()
	const [canRetry, setCanRetry] = useState<boolean>(false)
	const width = stdout?.columns ?? 80;
	const maxDownloadRetries = 3;

	const [vanillaList, setVanillaList] = useState<vanillaList | null>(null)
	const [fabricList, setFabricList] = useState<fabricVersion[] | null>(null)

	const [showVersion, setShowVersion] = useState<boolean>(false)

	const [modLoaderType, setModLoaderType] = useState<MenuValue | null>()

	useInput((input) => {
		if (!canRetry || isDownloading) return;

		if (input === 'y' && selectedVersion) {
			const url = type?.value === 'vanilla' 
				? vanillaList?.versions.find(v => v.id === selectedVersion)?.url
				: fabricList?.find(v => v.version === selectedVersion)?.url;
			const typeValue = type?.value === 'vanilla' ? 'vanilla' : 'fabric';
			if (url) {
				void downloadWithRetry(selectedVersion, url, typeValue)
			}
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

	const modLoaderList: MenuValue[] = [
		{
			label: 'Forge',
			value: 'forge'
		},
		{
			label: 'Fabric',
			value: 'fabric'
		}
	]

	const handleTypeSelect = (selectedType: MenuValue) => {
		setType(selectedType);
		if (selectedType.value === 'vanilla') {
			fetchVanilla()
		}
		if (selectedType.value === 'mod') {
			setStage(2)
		}
		if (selectedType.value === 'plugin') {
			//TODO
		}
		if (selectedType.value === 'modnplugin') {
			//TODO
		}
	};

	const handleModLoaderSelect = (selectedType: MenuValue) => {
		setModLoaderType(selectedType)
		if (selectedType.value === 'fabric') {
			fetchFabric()
		}
		if (selectedType.value === 'forge') {
			//TODO
		}
	}

	// Download

	// Vanilla
	const handleVanillaVersionDownload = async (item: string) => {
		if (vanillaList) {
			const version = vanillaList.versions.find(v => v.id === item)
			setSelectedVersion(version?.id)
			if (!version) return;

			setDownloadError(null)
			setCanRetry(false)
			setStage(3)
			void downloadWithRetry(version.id, version.url, "vanilla")
		}
	}

	// Fabric
const handleFabricVersionDownload = async (item: string) => {
	if (fabricList) {
		const version = fabricList.find(v => v.version === item)
		setSelectedVersion(version?.version)
		if (!version) return;

		setDownloadError(null)
		setCanRetry(false)
		setStage(3)

		if (!version.url) {
			setDownloadError("Fabric download URL missing (only version provided).")
			setIsDownloading(false)
			setCanRetry(false)
			return
		}

		void downloadWithRetry(version.version, version.url, "fabric")
	}
}
	
	// Fetch

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

	// Fabric
async function fetchFabric() {
	setIsLoading(true)
	const res = await fetch(
		"https://meta.fabricmc.net/v2/versions"
	)
	const data = await res.json()
	const list: fabricVersion[] = Array.isArray(data?.game)
		? data.game
		: []
	setFabricList(list.filter(version => version.stable === true))
	setIsLoading(false)
	setShowVersion(true)
}


	async function downloadWithRetry(version: string, url: URL, type: string) {
		setIsDownloading(true)
		setDownloadError(null)

		let lastError: string | null = null

		for (let attempt = 1; attempt <= maxDownloadRetries; attempt++) {
			try {
				await downloadServer(url, version, type)
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
									onSelect={handleVanillaVersionDownload}
								/>
							</Box>
						)}
						{type?.value === 'mod' && (
							<Box flexDirection='column'>
								<Text color="gray">Select mod loader</Text>
								<SelectInput items={modLoaderList} onSelect={handleModLoaderSelect} />
								{isLoading && <Spinner type='dots' />}
								{showVersion && (
									<>
										<Text>Instance name: {name}</Text>
										<Text>Type: {type?.label}</Text>
										<Text>Mod Loader: {modLoaderType?.label}</Text>
										<Newline />
										{modLoaderType?.value === 'fabric' && (
											<>
													<AutoGrid
														items={fabricList?.map(v => v.version) || []}
														width={width}
														onSelect={handleFabricVersionDownload}
													/>
											</>
										)}
										{modLoaderType?.value === 'forge' && (
											<>
												{/* TODO */}
											</>
										)}
									</>
								)}
							</Box>
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
							<Text>Version: {selectedVersion}</Text>
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
