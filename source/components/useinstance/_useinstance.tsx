import React from "react";
import { useEffect, useState } from "react";
import fs from "fs/promises";
import path from "path";

import { Box, Text, useInput } from "ink";
import Mods from "./mods.js";
import Vanilla from "./vanilla.js";

interface Version {
    name: string,
    type: "vanilla" | "fabric" | "forge"
}

interface VersionData {
    name: string,
    version: string,
    type: string,
    serverJar: string,
    initialized: boolean,
    createdAt: string
}

export default function UseInstance() {
    const [versions, setVersions] = useState<Version[]>([])
    const [selectedVersionType, setSelectedVersionType] = useState<VersionData>()
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [scrollOffset, setScrollOffset] = useState(0)
    const versionsDir = path.resolve(process.cwd(), 'data/versions')

    const maxVisible = 5 // 最多显示5个选项

    useEffect(() => {
        async function loadFolders() {
            try {
                const entries = await fs.readdir(versionsDir, { withFileTypes: true })
                const folderList = entries
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => dirent.name)

                const results = await Promise.all(
                    folderList.map(async (folder) => {
                        const jsonPath = path.join(versionsDir, folder, "meta.json")
                        const content = await fs.readFile(jsonPath, "utf-8")
                        const data = JSON.parse(content)
                        return {
                            name: folder,
                            type: data.type
                        }
                    })
                )
                setVersions(results)
            } catch (error) {
                console.error(error)
            }
        }
        loadFolders()
    }, [])

    // 键盘导航
    useInput(async (_input, key) => {
        if (key.downArrow) {
            setSelectedIndex(prev => {
                const newIndex = Math.min(prev + 1, versions.length - 1)
                // 自动滚动
                if (newIndex >= scrollOffset + maxVisible) {
                    setScrollOffset(newIndex - maxVisible + 1)
                }
                return newIndex
            })
        } else if (key.upArrow) {
            setSelectedIndex(prev => {
                const newIndex = Math.max(prev - 1, 0)
                // 自动滚动
                if (newIndex < scrollOffset) {
                    setScrollOffset(newIndex)
                }
                return newIndex
            })
        } else if (key.return) {
            // 按 Enter 选择
            const selected = versions[selectedIndex]
            if (selected) {
                console.log(`Selected: ${selected.name} (${selected.type})`)
                const version = await loadVersion(selected.name)
                setSelectedVersionType(version)
            }
        } else if (key.escape && selectedVersionType) {
            // 按 Esc 返回实例选择
            setSelectedVersionType(undefined)
        }
    }, { isActive: !selectedVersionType })

    async function loadVersion(version: string) {
        const jsonPath = path.join(process.cwd(), "data", "versions", version, "meta.json")
        const data = await fs.readFile(jsonPath, "utf-8")
        const parsedData = await JSON.parse(data)
        return ({ name: version, version: parsedData.version, type: parsedData.type, serverJar: parsedData.serverJar, initialized: parsedData.initialized, createdAt: parsedData.createdAt })
    }

    const visibleVersions = versions.slice(scrollOffset, scrollOffset + maxVisible)

    return (
        <>
            {/* yet selected */}
            {(!selectedVersionType) && (
                <Box flexDirection="column">
                <Text bold color="cyan">Pick an instance:</Text>
                <Box flexDirection="column" marginTop={1} gap={1}>
                    {visibleVersions.map((version, index) => {
                        const actualIndex = scrollOffset + index
                        const isSelected = actualIndex === selectedIndex
                        const typeCapitalized = version.type.charAt(0).toUpperCase() + version.type.slice(1)

                        return (
                            <Box key={version.name} flexDirection="row" alignItems="center">
                                <Text color={isSelected ? "green" : "gray"}>
                                    {isSelected ? "> " : "  "}
                                </Text>
                                <Box flexDirection="column">
                                    <Text
                                        color={isSelected ? "greenBright" : "white"}
                                        bold={isSelected}
                                    >
                                        {version.name}
                                    </Text>
                                    <Text color="gray">
                                        {typeCapitalized}
                                    </Text>
                                </Box>
                            </Box>
                        )
                    })}
                </Box>

                {versions.length > maxVisible && (
                    <Box marginTop={1}>
                        <Text dimColor>
                            {scrollOffset > 0 && "↑ "}
                            {scrollOffset + 1}-{Math.min(scrollOffset + maxVisible, versions.length)} / {versions.length}
                            {scrollOffset + maxVisible < versions.length && " ↓"}
                        </Text>ƒ
                    </Box>
                )}
                </Box>
            )}

            {/* selected vanilla */}
            {(selectedVersionType?.type === 'vanilla') && (
                <Vanilla
                    key={selectedVersionType.name}
                    versionData={selectedVersionType}
                    onExit={() => setSelectedVersionType(undefined)}
                />
            )}

            {/* selected mods */}
            {(selectedVersionType?.type === 'fabric' || selectedVersionType?.type === 'forge') && (
                <Mods
                    key={selectedVersionType.name}
                    versionData={selectedVersionType}
                    onExit={() => setSelectedVersionType(undefined)}
                />
            )}
        </>
    )
}
