import React, { useState } from "react"
import { Box, Text, useInput } from "ink"
import SelectInput from "ink-select-input"
import TextInput from "ink-text-input"
import Spinner from "ink-spinner"
import fs from "fs/promises"
import path from "path"
import { createWriteStream } from "fs"

interface ModSearchResult {
    project_id: string
    title: string
    description: string
    author: string
    downloads: number
    icon_url?: string
    categories: string[]
}

interface AddModProps {
    minecraftVersion: string
    modLoader: string // 'fabric' or 'forge'
    serverName: string // 服务器名称，用于找到 mods 目录
    onExit: () => void
}

export default function AddMod({ minecraftVersion, modLoader, serverName, onExit }: AddModProps) {
    const [searchQuery, setSearchQuery] = useState<string>('')
    const [searching, setSearching] = useState<boolean>(false)
    const [searchResults, setSearchResults] = useState<ModSearchResult[]>([])
    const [selectedIndex, setSelectedIndex] = useState<number>(0)
    const [mode, setMode] = useState<'choose' | 'input' | 'url' | 'urlConfirm' | 'results' | 'downloading'>('choose')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [confirmMessage, setConfirmMessage] = useState<string | null>(null)
    const [downloadProgress, setDownloadProgress] = useState<number>(0)
    const [downloadingModName, setDownloadingModName] = useState<string>('')
    const [urlInput, setUrlInput] = useState<string>('')
    const [pendingProject, setPendingProject] = useState<ModSearchResult | null>(null)
    const [pendingFile, setPendingFile] = useState<{ filename: string; url: string } | null>(null)

    const searchMods = async () => {
        if (!searchQuery.trim()) {
            setErrorMessage('Please enter a search term')
            return
        }

        setSearching(true)
        setErrorMessage(null)

        try {
            const facets = JSON.stringify([
                [`versions:${minecraftVersion}`],
                [`categories:${modLoader}`],
                ['project_type:mod']
            ])

            const url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(searchQuery)}&facets=${encodeURIComponent(facets)}&limit=20`

            const response = await fetch(url)
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`)
            }

            const data = await response.json()

            if (data.hits && data.hits.length > 0) {
                const results: ModSearchResult[] = data.hits.map((hit: any) => ({
                    project_id: hit.project_id,
                    title: hit.title,
                    description: hit.description,
                    author: hit.author,
                    downloads: hit.downloads,
                    icon_url: hit.icon_url,
                    categories: hit.categories || []
                }))

                setSearchResults(results)
                setMode('results')
                setSelectedIndex(0)
            } else {
                setErrorMessage('No mods found. Try a different search term.')
            }
        } catch (error) {
            console.error('Search error:', error)
            setErrorMessage('Failed to search mods. Check your internet connection.')
        } finally {
            setSearching(false)
        }
    }

    useInput((_input, key) => {
        if (mode === 'choose' && key.escape) {
            onExit()
        }
    }, { isActive: mode === 'choose' })

    // 输入模式的键盘处理
    useInput((_input, key) => {
        if (mode === 'input') {
            if (key.escape) {
                setMode('choose')
                setErrorMessage(null)
            }
        }
    }, { isActive: mode === 'input' && !searching })

    useInput((_input, key) => {
        if (mode === 'url' && key.escape) {
            setMode('choose')
            setErrorMessage(null)
        }
    }, { isActive: mode === 'url' && !searching })

    useInput((_input, key) => {
        if (mode === 'urlConfirm') {
            if (key.escape) {
                setMode('url')
                setConfirmMessage(null)
                setPendingProject(null)
                setPendingFile(null)
            } else if (_input === 'y' || _input === 'Y') {
                if (pendingFile && pendingProject) {
                    downloadModFile(pendingFile, pendingProject, 'url')
                } else if (pendingProject) {
                    downloadLatestForMismatch(pendingProject)
                }
            } else if (_input === 'n' || _input === 'N') {
                setMode('url')
                setConfirmMessage(null)
                setPendingProject(null)
                setPendingFile(null)
            }
        }
    }, { isActive: mode === 'urlConfirm' })

    const getPrimaryFile = async (
        projectId: string,
        options: { minecraftVersion?: string; modLoader?: string }
    ): Promise<{ filename: string; url: string } | null> => {
        const params = new URLSearchParams()

        if (options.modLoader) {
            params.set('loaders', JSON.stringify([options.modLoader]))
        }
        if (options.minecraftVersion) {
            params.set('game_versions', JSON.stringify([options.minecraftVersion]))
        }

        const query = params.toString()
        const versionsUrl = `https://api.modrinth.com/v2/project/${projectId}/version${query ? `?${query}` : ''}`
        const versionsResponse = await fetch(versionsUrl)

        if (!versionsResponse.ok) {
            throw new Error('Failed to fetch mod versions')
        }

        const versions = await versionsResponse.json()

        if (!Array.isArray(versions) || versions.length === 0) {
            return null
        }

        const latestVersion = versions[0]
        const primaryFile = latestVersion.files.find((f: any) => f.primary) || latestVersion.files[0]

        if (!primaryFile) {
            throw new Error('No downloadable file found')
        }

        return { filename: primaryFile.filename, url: primaryFile.url }
    }

    const downloadModFile = async (
        file: { filename: string; url: string },
        mod: ModSearchResult,
        fallbackMode: 'results' | 'url'
    ) => {
        setMode('downloading')
        setDownloadingModName(mod.title)
        setDownloadProgress(0)
        setErrorMessage(null)
        setConfirmMessage(null)

        try {
            const modsDir = path.join(process.cwd(), 'data', 'versions', serverName, 'mods')
            await fs.mkdir(modsDir, { recursive: true })

            const filePath = path.join(modsDir, file.filename)
            const response = await fetch(file.url)

            if (!response.ok || !response.body) {
                throw new Error('Failed to download mod file')
            }

            const totalSize = parseInt(response.headers.get('content-length') || '0')
            let downloadedSize = 0
            const fileStream = createWriteStream(filePath)
            const reader = response.body.getReader()

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                fileStream.write(value)
                downloadedSize += value.length

                if (totalSize > 0) {
                    setDownloadProgress(Math.round((downloadedSize / totalSize) * 100))
                }
            }

            await new Promise((resolve, reject) => {
                fileStream.end()
                fileStream.on('finish', resolve)
                fileStream.on('error', reject)
            })

            setMode('choose')
            setSearchResults([])
            setSearchQuery('')
            setUrlInput('')
            setDownloadProgress(0)
            setDownloadingModName('')

            setTimeout(() => {
                onExit()
            }, 2000)
        } catch (error: any) {
            console.error('Download error:', error)
            setErrorMessage(`Failed to download: ${error.message}`)
            setMode(fallbackMode)
            setDownloadProgress(0)
        }
    }

    const downloadMod = async (mod: ModSearchResult) => {
        setErrorMessage(null)

        try {
            const primaryFile = await getPrimaryFile(mod.project_id, {
                minecraftVersion,
                modLoader
            })

            if (!primaryFile) {
                throw new Error(`No compatible version found for Minecraft ${minecraftVersion}`)
            }

            await downloadModFile(primaryFile, mod, 'results')
        } catch (error: any) {
            console.error('Download error:', error)
            setErrorMessage(`Failed to download: ${error.message}`)
            setMode('results')
            setDownloadProgress(0)
        }
    }

    const downloadFromUrl = async (rawUrl: string) => {
        if (!rawUrl.trim()) {
            setErrorMessage('Please enter a URL')
            return
        }

        let url: URL
        try {
            url = new URL(rawUrl.trim())
        } catch {
            setErrorMessage('Invalid URL')
            return
        }

        const host = url.hostname.replace(/^www\./, '')
        if (host !== 'modrinth.com') {
            setErrorMessage('Only Modrinth URLs are supported')
            return
        }

        const segments = url.pathname.split('/').filter(Boolean)
        const modIndex = segments.indexOf('mod')
        const slug = modIndex >= 0 ? segments[modIndex + 1] : null
        if (!slug) {
            setErrorMessage('Invalid Modrinth mod URL')
            return
        }

        try {
            const projectResponse = await fetch(`https://api.modrinth.com/v2/project/${slug}`)
            if (!projectResponse.ok) {
                throw new Error('Failed to fetch Modrinth project')
            }

            const project = await projectResponse.json()
            const mod: ModSearchResult = {
                project_id: project.id,
                title: project.title || slug,
                description: project.description || '',
                author: project.author || 'Unknown',
                downloads: project.downloads || 0,
                icon_url: project.icon_url,
                categories: project.categories || []
            }

            const compatibleFile = await getPrimaryFile(mod.project_id, {
                minecraftVersion,
                modLoader
            })

            if (!compatibleFile) {
                setPendingProject(mod)
                setPendingFile(null)
                setConfirmMessage(
                    `No compatible version found for Minecraft ${minecraftVersion} (${modLoader}). Install anyway? (y/n)`
                )
                setMode('urlConfirm')
                return
            }

            setPendingProject(mod)
            setPendingFile(compatibleFile)
            setConfirmMessage(
                `Compatible version found for Minecraft ${minecraftVersion} (${modLoader}). Install? (y/n)`
            )
            setMode('urlConfirm')
        } catch (error: any) {
            console.error('Download error:', error)
            setErrorMessage(`Failed to download: ${error.message}`)
            setMode('url')
            setDownloadProgress(0)
        }
    }

    const downloadLatestForMismatch = async (mod: ModSearchResult) => {
        setPendingProject(null)
        try {
            let file = await getPrimaryFile(mod.project_id, { modLoader })
            if (!file) {
                file = await getPrimaryFile(mod.project_id, {})
            }
            if (!file) {
                throw new Error('No downloadable file found')
            }
            await downloadModFile(file, mod, 'url')
        } catch (error: any) {
            console.error('Download error:', error)
            setErrorMessage(`Failed to download: ${error.message}`)
            setMode('url')
            setDownloadProgress(0)
        }
    }

    // 结果模式的键盘处理
    useInput((_input, key) => {
        if (mode === 'results') {
            if (key.escape) {
                setMode('input')
                setSearchResults([])
                setSearchQuery('')
            } else if (key.upArrow && selectedIndex > 0) {
                setSelectedIndex(selectedIndex - 1)
            } else if (key.downArrow && selectedIndex < searchResults.length - 1) {
                setSelectedIndex(selectedIndex + 1)
            } else if (key.return && searchResults[selectedIndex]) {
                downloadMod(searchResults[selectedIndex])
            }
        }
    }, { isActive: mode === 'results' })

    if (searching) {
        return (
            <Box flexDirection="column">
                <Text>Searching for mods...</Text>
                <Box marginTop={1}>
                    <Spinner type="dots" />
                    <Text> Fetching results from Modrinth</Text>
                </Box>
            </Box>
        )
    }

    if (mode === 'downloading') {
        return (
            <Box flexDirection="column">
                <Text bold>Downloading {downloadingModName}</Text>
                <Box marginTop={1}>
                    <Spinner type="dots" />
                    <Text> Download in progress... {downloadProgress}%</Text>
                </Box>
                {downloadProgress === 100 && (
                    <Box marginTop={1}>
                        <Text color="green">✓ Download complete! Installing mod...</Text>
                    </Box>
                )}
            </Box>
        )
    }

    if (mode === 'choose') {
        return (
            <Box flexDirection="column">
                <Text bold>Add Mods to Your Server</Text>
                <Box marginTop={1}>
                    <Text dimColor>Minecraft: {minecraftVersion} | Mod Loader: {modLoader}</Text>
                </Box>
                <Box marginTop={1}>
                    <SelectInput
                        items={[
                            { label: 'Search mods', value: 'search' },
                            { label: 'Install from URL', value: 'url' }
                        ]}
                        onSelect={(item) => {
                            setErrorMessage(null)
                            if (item.value === 'search') {
                                setMode('input')
                            }
                            if (item.value === 'url') {
                                setMode('url')
                            }
                        }}
                    />
                </Box>
                <Box marginTop={1}>
                    <Text dimColor>Press Enter to select, Esc to go back</Text>
                </Box>
                {errorMessage && (
                    <Box marginTop={1}>
                        <Text color="red">{errorMessage}</Text>
                    </Box>
                )}
            </Box>
        )
    }

    if (mode === 'input') {
        return (
            <Box flexDirection="column">
                <Text bold>Add Mods to Your Server</Text>
                <Box marginTop={1}>
                    <Text dimColor>Minecraft: {minecraftVersion} | Mod Loader: {modLoader}</Text>
                </Box>
                <Box marginTop={1}>
                    <Text>Search for mods: </Text>
                    <TextInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        onSubmit={searchMods}
                        placeholder="Enter mod name..."
                    />
                </Box>
                <Box marginTop={1}>
                    <Text dimColor>Press Enter to search, Esc to go back</Text>
                </Box>
                {errorMessage && (
                    <Box marginTop={1}>
                        <Text color="red">{errorMessage}</Text>
                    </Box>
                )}
            </Box>
        )
    }

    if (mode === 'url') {
        return (
            <Box flexDirection="column">
                <Text bold>Install Mod from URL</Text>
                <Box marginTop={1}>
                    <Text>Mod URL: </Text>
                    <TextInput
                        value={urlInput}
                        onChange={setUrlInput}
                        onSubmit={downloadFromUrl}
                        placeholder="https://modrinth.com/mod/fabric-api"
                    />
                </Box>
                <Box marginTop={1}>
                    <Text dimColor>Press Enter to download, Esc to go back</Text>
                </Box>
                {errorMessage && (
                    <Box marginTop={1}>
                        <Text color="red">{errorMessage}</Text>
                    </Box>
                )}
            </Box>
        )
    }

    if (mode === 'urlConfirm') {
        return (
            <Box flexDirection="column">
                <Text bold>Install Mod from URL</Text>
                {pendingProject && (
                    <Box
                        flexDirection="column"
                        borderStyle="single"
                        borderColor="yellow"
                        paddingX={1}
                        marginTop={1}
                    >
                        <Text bold>{pendingProject.title}</Text>
                        <Text dimColor>by {pendingProject.author}</Text>
                        <Text>{pendingProject.description}</Text>
                        <Text dimColor>Downloads: {pendingProject.downloads.toLocaleString()}</Text>
                    </Box>
                )}
                <Box marginTop={1}>
                    <Text color="yellow">{confirmMessage}</Text>
                </Box>
                <Box marginTop={1}>
                    <Text dimColor>Press Y to install anyway, N or Esc to go back</Text>
                </Box>
            </Box>
        )
    }

    // Results mode
    const visibleCount = 3
    const maxStartIndex = Math.max(searchResults.length - visibleCount, 0)
    const startIndex = Math.min(
        Math.max(selectedIndex - Math.floor(visibleCount / 2), 0),
        maxStartIndex
    )
    const visibleResults = searchResults.slice(startIndex, startIndex + visibleCount)

    return (
        <Box flexDirection="column">
            <Text bold>Search Results for "{searchQuery}"</Text>
            <Box marginTop={1}>
                <Text dimColor>Found {searchResults.length} mods (Press Esc to search again)</Text>
            </Box>
            <Box flexDirection="column" marginTop={1}>
                {visibleResults.map((mod, index) => {
                    const actualIndex = startIndex + index
                    return (
                    <Box
                        key={mod.project_id}
                        flexDirection="column"
                        borderStyle="single"
                        borderColor={actualIndex === selectedIndex ? 'cyan' : 'gray'}
                        paddingX={1}
                        marginY={0}
                    >
                        <Text bold color={actualIndex === selectedIndex ? 'cyan' : 'white'}>
                            {mod.title}
                        </Text>
                        <Text dimColor>by {mod.author}</Text>
                        <Text>{mod.description}</Text>
                        <Text dimColor>Downloads: {mod.downloads.toLocaleString()}</Text>
                    </Box>
                    )
                })}
            </Box>
            <Box marginTop={1}>
                <Text dimColor>
                    {selectedIndex + 1}/{searchResults.length} • Use arrow keys to navigate, Enter to install, Esc to go back
                </Text>
            </Box>
        </Box>
    )
}
