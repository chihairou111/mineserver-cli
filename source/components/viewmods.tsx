import React, { useEffect, useState } from "react"
import { Box, Text, useInput } from "ink"
import Spinner from "ink-spinner"
import fs from "fs/promises"
import path from "path"

interface ViewModsProps {
    serverName: string
    onExit: () => void
}

export default function ViewMods({ serverName, onExit }: ViewModsProps) {
    const [mods, setMods] = useState<string[]>([])
    const [selectedIndex, setSelectedIndex] = useState<number>(0)
    const [loading, setLoading] = useState<boolean>(true)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [mode, setMode] = useState<"list" | "confirm">("list")

    const modsDir = path.join(process.cwd(), "data", "versions", serverName, "mods")

    const loadMods = async () => {
        setLoading(true)
        setErrorMessage(null)
        try {
            const entries = await fs.readdir(modsDir, { withFileTypes: true })
            const files = entries
                .filter((e) => e.isFile() && e.name !== ".mods.json")
                .map((e) => e.name)
            setMods(files)
            setSelectedIndex((prev) => Math.min(prev, Math.max(files.length - 1, 0)))
        } catch (error: any) {
            if (error?.code === "ENOENT") {
                setMods([])
            } else {
                console.error("Failed to load mods:", error)
                setErrorMessage("Failed to load mods.")
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadMods()
    }, [])

    const deleteSelected = async () => {
        const mod = mods[selectedIndex]
        if (!mod) return
        try {
            await fs.unlink(path.join(modsDir, mod))
            await loadMods()
        } catch (error) {
            console.error("Failed to delete mod:", error)
            setErrorMessage("Failed to delete mod.")
        } finally {
            setMode("list")
        }
    }

    useInput((_input, key) => {
        if (mode === "list") {
            if (key.escape) {
                onExit()
            } else if (key.upArrow) {
                setSelectedIndex((prev) => Math.max(prev - 1, 0))
            } else if (key.downArrow) {
                setSelectedIndex((prev) => Math.min(prev + 1, mods.length - 1))
            } else if (key.return && mods[selectedIndex]) {
                setMode("confirm")
            }
        } else if (mode === "confirm") {
            if (key.escape) {
                setMode("list")
            } else if (_input === "y" || _input === "Y") {
                deleteSelected()
            } else if (_input === "n" || _input === "N") {
                setMode("list")
            }
        }
    }, { isActive: !loading })

    if (loading) {
        return (
            <Box flexDirection="column">
                <Text>Loading mods...</Text>
                <Box marginTop={1}>
                    <Spinner type="dots" />
                    <Text> Reading mods folder</Text>
                </Box>
            </Box>
        )
    }

    return (
        <Box flexDirection="column">
            <Text bold>Installed Mods</Text>
            {errorMessage && (
                <Box marginTop={1}>
                    <Text color="red">{errorMessage}</Text>
                </Box>
            )}
            {mods.length === 0 ? (
                <Box marginTop={1}>
                    <Text dimColor>No mods installed. Press Esc to go back.</Text>
                </Box>
            ) : (
                <>
                    <Box flexDirection="column" marginTop={1}>
                        {(() => {
                            const visibleCount = 5
                            const maxStartIndex = Math.max(mods.length - visibleCount, 0)
                            const startIndex = Math.min(
                                Math.max(selectedIndex - Math.floor(visibleCount / 2), 0),
                                maxStartIndex
                            )
                            const visibleMods = mods.slice(startIndex, startIndex + visibleCount)

                            return visibleMods.map((mod, index) => {
                                const actualIndex = startIndex + index
                                const isSelected = actualIndex === selectedIndex
                                return (
                                    <Box
                                        key={mod}
                                        borderStyle="single"
                                        borderColor={isSelected ? "cyan" : "gray"}
                                        paddingX={1}
                                    >
                                        <Text color={isSelected ? "cyan" : "white"}>{mod}</Text>
                                    </Box>
                                )
                            })
                        })()}
                    </Box>
                    {mode === "confirm" ? (
                        <Box marginTop={1}>
                            <Text color="yellow">
                                Delete "{mods[selectedIndex]}"? (y/n)
                            </Text>
                        </Box>
                    ) : (
                        <Box marginTop={1}>
                            <Text dimColor>
                                {selectedIndex + 1}/{mods.length} • Use arrow keys to navigate, Enter to delete, Esc to go back
                            </Text>
                        </Box>
                    )}
                </>
            )}
        </Box>
    )
}
