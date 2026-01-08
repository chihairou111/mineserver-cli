import React, { useState } from "react"
import { Box, Text, useInput } from "ink"
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
    const [mode, setMode] = useState<'input' | 'results' | 'downloading'>('input')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [downloadProgress, setDownloadProgress] = useState<number>(0)
    const [downloadingModName, setDownloadingModName] = useState<string>('')

    const searchMods = async () => {
        if (!searchQuery.trim()) {
            setErrorMessage('Please enter a search term')
            return
        }

        setSearching(true)
        setErrorMessage(null)

        try {
            // Modrinth API 搜索
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

    // 输入模式的键盘处理
    useInput((_input, key) => {
        if (mode === 'input') {
            if (key.escape) {
                onExit()
            }
        }
    }, { isActive: mode === 'input' && !searching })

    const downloadMod = async (mod: ModSearchResult) => {
        setMode('downloading')
        setDownloadingModName(mod.title)
        setDownloadProgress(0)
        setErrorMessage(null)

        try {
            // 1. 获取 mod 的版本信息
            const versionsUrl = `https://api.modrinth.com/v2/project/${mod.project_id}/version?loaders=["${modLoader}"]&game_versions=["${minecraftVersion}"]`
            const versionsResponse = await fetch(versionsUrl)

            if (!versionsResponse.ok) {
                throw new Error('Failed to fetch mod versions')
            }

            const versions = await versionsResponse.json()

            if (!versions || versions.length === 0) {
                throw new Error(`No compatible version found for Minecraft ${minecraftVersion}`)
            }

            // 取第一个版本（通常是最新的）
            const latestVersion = versions[0]
            const primaryFile = latestVersion.files.find((f: any) => f.primary) || latestVersion.files[0]

            if (!primaryFile) {
                throw new Error('No downloadable file found')
            }

            // 2. 创建 mods 目录（如果不存在）
            const modsDir = path.join(process.cwd(), 'data', 'versions', serverName, 'mods')
            await fs.mkdir(modsDir, { recursive: true })

            // 3. 下载文件
            const filePath = path.join(modsDir, primaryFile.filename)
            const response = await fetch(primaryFile.url)

            if (!response.ok || !response.body) {
                throw new Error('Failed to download mod file')
            }

            // 获取文件大小
            const totalSize = parseInt(response.headers.get('content-length') || '0')
            let downloadedSize = 0

            // 使用 Node.js stream 下载
            const fileStream = createWriteStream(filePath)

            // 转换 Web Stream 到 Node Stream
            const reader = response.body.getReader()

            while (true) {
                const { done, value } = await reader.read()

                if (done) break

                fileStream.write(value)
                downloadedSize += value.length

                // 更新进度
                if (totalSize > 0) {
                    setDownloadProgress(Math.round((downloadedSize / totalSize) * 100))
                }
            }

            await new Promise((resolve, reject) => {
                fileStream.end()
                fileStream.on('finish', resolve)
                fileStream.on('error', reject)
            })

            // 下载完成
            setMode('input')
            setSearchResults([])
            setSearchQuery('')
            setDownloadProgress(0)
            setDownloadingModName('')

            // 显示成功消息后返回
            setTimeout(() => {
                onExit()
            }, 2000)

        } catch (error: any) {
            console.error('Download error:', error)
            setErrorMessage(`Failed to download: ${error.message}`)
            setMode('results')
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
