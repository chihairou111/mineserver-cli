import React, {useState} from 'react';
import {Box, Text, useStdout, useInput, Newline} from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import Spinner from 'ink-spinner';

import { AutoGrid } from './ui/autogrid.js';
import ProgressBar from './ui/progressbar.js';
import { downloadServer } from '../utils/downloadserver.js';

import fs from 'fs/promises'
import path from 'path'

type MenuValue = {label: string; value: string};


// Vanilla
interface vanillaVersion {
	id: string,
	type: string,
	url: string
}

interface vanillaList {
	versions: vanillaVersion[]
}

// Fabric

interface fabricList {
	version: string,
	stable: boolean
}

// Forge

interface forgeVersion {
	type: string,
	url: string
}

interface forgeList {
	[mcVersion: string]: forgeVersion[]
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
	const [downloadedBytes, setDownloadedBytes] = useState<number>(0)
	const [totalBytes, setTotalBytes] = useState<number>(0)
	const width = stdout?.columns ?? 80;
	const maxDownloadRetries = 3;

	const [maxMemory, setMaxMemory] = useState<string>('2');

	const [vanillaList, setVanillaList] = useState<vanillaList | null>(null)
	const [fabricList, setFabricList] = useState<fabricList[] | null>(null)
	const [forgeList, setForgeList] = useState<forgeList | null>(null)

	const [showVersion, setShowVersion] = useState<boolean>(false)

	const [modLoaderType, setModLoaderType] = useState<MenuValue | null>()

	const [showChangeName, setShowChangeName] = useState<boolean>(false)

	const versionsDir = path.resolve(process.cwd(), 'data/versions')

	const handleNameChange = (value: string) => {
		setName(value)
		setIsNameNull(false)
		setShowChangeName(false)
	}

	useInput((input) => {
		if (!canRetry || isDownloading) return;

		if (input === 'y' && selectedVersion) {
			if (type?.value === 'vanilla') {
				const url = vanillaList?.versions.find(v => v.id === selectedVersion)?.url
				if (url) {
					void downloadWithRetry(selectedVersion, url, 'vanilla', maxMemory)
				}
				return;
			}

			// Fabric retry uses same flow as handleFabricVersionDownload
			void (async () => {
				const res = await fetch('https://meta.fabricmc.net/v2/versions/installer')
				const installers = await res.json()
				const installerURL = installers?.[0]?.url

				if (!installerURL) {
					setDownloadError("Fabric installer URL not found.")
					setCanRetry(false)
					return
				}

				void downloadWithRetry(selectedVersion, installerURL, 'fabric', maxMemory)
			})()
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
	};

	// We insert a memory selection handler for stage 2.5
	const handleMemorySubmit = (value: string) => {
        let finalValue = value.trim() || '2'
        
        // If user just typed a number, assume GB
        if (/^\d+$/.test(finalValue)) {
            finalValue += 'G'
        }
        // Basic validation: if it doesn't look like Java memory arg, fallback to 2G
        if (!/^\d+[GMKgmk]$/.test(finalValue)) {
            finalValue = '2G'
        }

		setMaxMemory(finalValue.toUpperCase());
        
        if (type?.value === 'mod') {
            setShowVersion(true)
            setStage(2)
        } else {
            setStage(2); // Go to version selection
        }
	}

	const handleModLoaderSelect = (selectedType: MenuValue) => {
		setModLoaderType(selectedType)
		if (selectedType.value === 'fabric') {
			fetchFabric()
		}
		if (selectedType.value === 'forge') {
			fetchForge()
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
			void downloadWithRetry(version.id, version.url, "vanilla", maxMemory)
		}
	}

	// Fabric
	const handleFabricVersionDownload = async (item: string) => {
		if (fabricList) {
			const version = fabricList.find(v => v.version === item)
			setSelectedVersion(version?.version)
			if (!version) return;

			const res = await fetch('https://meta.fabricmc.net/v2/versions/installer')

			const installerList = await res.json()
			const installerURL = installerList?.[0]?.url

			setDownloadError(null)
			setCanRetry(false)
			setStage(3)

			if (!installerURL) {
				setDownloadError("Fabric installer URL not found.")
				setCanRetry(false)
				return
			}

			void downloadWithRetry(version.version, installerURL, "fabric", maxMemory)
		}
	}

	// Forge
	const handleForgeVersionDownload = async (item: string) => {
		if (forgeList) {
			const version = forgeList[item]?.[0]?.url
			setSelectedVersion(item)
			if (!version) return;

			setDownloadError(null)
			setCanRetry(false)
			setStage(3)
			void downloadWithRetry(item, version, "forge", maxMemory)
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
		setStage(2.5) // Insert memory stage
	}

	// Fabric
	async function fetchFabric() {
		setIsLoading(true)
		const res = await fetch(
			"https://meta.fabricmc.net/v2/versions"
		)
		const data = await res.json()
		const list: fabricList[] = Array.isArray(data?.game)
			? data.game
			: []
		setFabricList(list.filter(version => version.stable === true))
		setIsLoading(false)
		setStage(2.5) // Insert memory stage
        // showVersion will be triggered after memory selection in stage 2
	}

	// Forge
	async function fetchForge() {
		setIsLoading(true)
		const res = await fetch(
			"https://mrnavastar.github.io/ForgeVersionAPI/forge-versions.json"
		)
		const data = await res.json()
		setForgeList(Object.fromEntries(
			Object.entries(data).map(([version, loaders]) => [
				version,
				Array.isArray(loaders) ? loaders.filter(loader => loader.type === 'latest') : []
			])
		))
		setIsLoading(false)
		setStage(2.5) // Insert memory stage
        // showVersion will be triggered after memory selection in stage 2
	}


	async function downloadWithRetry(version: string, url: string | URL, type: string, maxMemory: string) {
		setIsDownloading(true)
		setDownloadError(null)
		setDownloadedBytes(0)
		setTotalBytes(0)

		let lastError: string | null = null
		const targetUrl = typeof url === 'string' ? new URL(url) : url

		for (let attempt = 1; attempt <= maxDownloadRetries; attempt++) {
			try {
				const result = await downloadServer(
					targetUrl.toString(),
					version,
					type,
					name,
					maxMemory,
					(done, total) => {
						setDownloadedBytes(done)
						setTotalBytes(total)
					}
				)
				if (result) {
					setDownloadedBytes(result.downloadedBytes)
					setTotalBytes(result.totalBytes)
				}
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

	async function submitInstanceName(value: string) {
		setShowChangeName(false)
		if (!value) {
			setIsNameNull(true);
			return;
		}
		let hasValue = false

		let entries: import('fs').Dirent[] = []
		try {
			entries = await fs.readdir(versionsDir, { withFileTypes: true })
		} catch (err) {
			// If the folder does not exist yet, treat as empty and create it
			if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'ENOENT') {
				await fs.mkdir(versionsDir, { recursive: true })
			} else {
				throw err
			}
		}

		for (const entry of entries) {
			if (entry.isDirectory() && entry.name === value) {
				hasValue = true
				break
			}
		}
		if (hasValue) {
			setShowChangeName(true)
			return
		}
		setIsNameNull(false);
		setName(value);
		setStage(1);
	}

	return (
		<Box flexDirection='column' gap={1}>
			{/* Stage 0 */}
			{stage === 0 && (
				<Box flexDirection='column' gap={1}>
					<Text color="cyan" bold>Create new instance</Text>
					<Box flexDirection='column' paddingX={1} paddingY={1} gap={1}>
						<Text color="white">
							1. Instance name:
						</Text>
						<Box flexDirection='row' gap={1} alignItems='center'>
							<Text color="gray">{'>'}</Text>
							<TextInput value={name} onChange={handleNameChange} onSubmit={submitInstanceName}/>
						</Box>
						{(isNameNull) && <Text color="red">Name is null.</Text>}
						{(showChangeName) && <Text color="red">Folder with this name already exists.</Text>}
					</Box>
				</Box>
			)}
			{/* Stage 1 */}
			{stage === 1 && (
				<Box flexDirection='column' gap={1}>
					<Text>Instance name: {name}</Text>
					<Text color="cyan" bold>2. Select Type</Text>
					<Box paddingX={1} paddingY={1} gap={1}>
						<SelectInput items={typeList} onSelect={handleTypeSelect} />
						<Text color="gray">Choose the base stack for your server.</Text>
					</Box>
					{(isLoading) && <Spinner type='dots' />}
				</Box>
			)}
			{/* Stage 1.5 - Memory (We inject it when type is selected but before complex Logic) - Actually let's put it after Type selection */}
			{stage === 2.5 && (
				<Box flexDirection='column' gap={1}>
					<Text>Instance name: {name}</Text>
					<Text>Type: {type?.label}</Text>
					<Text color="cyan" bold>3. Max Memory (RAM)</Text>
					<Box flexDirection='column' paddingX={1} gap={0.5}>
						<Text color="gray">Enter amount in GB (e.g. 4). Default: 2</Text>
						<Box flexDirection='row' gap={1} alignItems='center'>
							<Text color="gray">{'>'}</Text>
							<TextInput value={maxMemory} onChange={setMaxMemory} onSubmit={handleMemorySubmit} />
						</Box>
                        {maxMemory && !/^\d+$/.test(maxMemory) && !/^\d+[GMKgmk]$/.test(maxMemory) && (
                             <Text color="yellow">Tip: Just enter a number for GB, e.g. "4"</Text>
                        )}
					</Box>
				</Box>
			)}

			{/* Stage 2 */}
			{stage === 2 && (
				<Box flexDirection='column' gap={1}>
					<Box flexDirection='column' gap={0.5}>
						<Text>Instance name: {name}</Text>
						<Text>Type: {type?.label}</Text>
					</Box>
					{type?.value === 'vanilla' && (
						<Box flexDirection='column' gap={1}>
							<Text color="gray">Select version</Text>
							<AutoGrid
								items={vanillaList?.versions.map(version => version.id) || []}
								width={width}
								onSelect={handleVanillaVersionDownload}
							/>
						</Box>
					)}
					{type?.value === 'mod' && (
						<Box flexDirection='column' gap={1}>
							{!showVersion && (
								<>
									<Text color="gray">Select mod loader</Text>
									<SelectInput items={modLoaderList} onSelect={handleModLoaderSelect} />
								</>
							)}
							{isLoading && <Spinner type='dots' />}
							{showVersion && (
								<Box flexDirection='column' gap={1}>
									<Box flexDirection='column' gap={0.5}>
										<Text>Instance name: {name}</Text>
										<Text>Type: {type?.label}</Text>
										<Text>Mod Loader: {modLoaderType?.label}</Text>
									</Box>
									{modLoaderType?.value === 'fabric' && (
										<AutoGrid
											items={fabricList?.map(v => v.version) || []}
											width={width}
											onSelect={handleFabricVersionDownload}
										/>
									)}
									{modLoaderType?.value === 'forge' && (
										<AutoGrid
											items={Object.keys(forgeList ?? {})}
											width={width}
											onSelect={handleForgeVersionDownload}
										/>
									)}
								</Box>
							)}
						</Box>
					)}
				</Box>
			)}
			{/* Stage 3 */}
			{stage === 3 && (
				<Box flexDirection='column' gap={1}>
					<Box flexDirection='column' gap={0.5}>
						<Text>Instance name: {name}</Text>
						<Text>Type: {type?.label}</Text>
						<Text>Version: {selectedVersion}</Text>
					</Box>
					{isDownloading && (
						<Box flexDirection='column' gap={1}>
							<Text>Downloading... </Text>
							<ProgressBar downloadedBytes={downloadedBytes} totalBytes={totalBytes} />
							<Newline />
						</Box>
					)}
					{!isDownloading && downloadError && (
						<Box flexDirection='column' gap={0.5}>
							<Text color='red'>{downloadError}</Text>
							<Text>{"Retry? (y/n)"}</Text>
						</Box>
					)}
					{!isDownloading && !downloadError && (
						<Text color="green">Download completed.</Text>
					)}
				</Box>
			)}
		</Box>
	);
}
