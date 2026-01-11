import path from 'path'
import fs from "fs/promises"
import { ChildProcess, spawn } from "child_process";
import { initialization } from "./initialization.js";

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

export async function startInstance(
    dirPath: string,
    initialized: boolean,
    setInitialized: (value: boolean | null) => void,
    serverJar: string,
    onOutput: (output: string) => void,
    setServerProcess: (process: ChildProcess) => void,
    onError?: () => void
) {
    let actualServerJar = serverJar

    if (!initialized) {
        setInitialized(false)
        await initialization(dirPath)

        // 初始化后重新读取 meta.json 获取更新后的 serverJar
        const metaPath = path.join(dirPath, "meta.json")
        const metaRaw = await fs.readFile(metaPath, "utf-8")
        const metaJson = await JSON.parse(metaRaw)
        actualServerJar = metaJson.serverJar // 使用初始化后更新的 serverJar
    }
    
    // Read maxMemory from meta.json to ensure persistence
    const metaPath = path.join(dirPath, "meta.json")
    const metaRaw = await fs.readFile(metaPath, "utf-8")
    const metaJson = await JSON.parse(metaRaw)
    const maxMemory = metaJson.maxMemory || "2G"

    setInitialized(true)
    const process = runInstance(dirPath, actualServerJar, maxMemory, onOutput, onError)
    setServerProcess(process)
}

export function runInstance(
    dirPath: string,
	actualServerJar: string,
    maxMemory: string = "2G",
    onOutput: (output: string) => void,
    onError?: () => void
) {
    const serverProcess = spawn('java', [`-Xmx${maxMemory}`, '-jar', actualServerJar, 'nogui'], {
        cwd: dirPath,
        stdio: ['pipe', 'pipe', 'pipe']
    })
    serverProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString()
        onOutput(output)
        // 检测启动失败消息
        if (output.includes('Failed to start the Minecraft server')) {
            serverProcess.kill()
            onError?.()
        }
    })
    serverProcess.stderr.on('data', (data: Buffer) => {
        const output = data.toString()
        onOutput(output)
        // 检测启动失败消息
        if (output.includes('Failed to start the Minecraft server')) {
            serverProcess.kill()
            onError?.()
        }
    })
    return serverProcess
}

export default function OutputWindow({
    output,
    serverProcess,
    actions,
    onAction
}: {
    output: string[]
    serverProcess: ChildProcess | null
    actions?: { label: string; value: string; command?: string; immediate?: boolean }[]
    onAction?: (value: string) => void
}) {
    const [query, setQuery] = useState<string>('')
    const [actionMode, setActionMode] = useState<boolean>(false)
    const [selectedActionIndex, setSelectedActionIndex] = useState<number>(0)
    const width = process.stdout.columns
    const boxWidth = Math.floor(width * 0.95)
    const maxOutputHeight = Math.max(10, Math.floor(process.stdout.rows * 0.5))
    const hasActions = Boolean(actions && actions.length > 0)

    const isActionKey = (_input: string, key: { tab?: boolean }) => {
        return Boolean(key.tab)
    }

    useInput((input, key) => {
        if (actionMode) {
            if (isActionKey(input, key)) {
                const action = actions?.[selectedActionIndex]
                if (!action) {
                    setActionMode(false)
                    return
                }
                if (action.command) {
                    if (action.immediate && serverProcess?.stdin) {
                        serverProcess.stdin.write(action.command + '\n')
                    } else {
                        setQuery(action.command + ' ')
                    }
                }
                if (!action.command && onAction) {
                    onAction(action.value)
                }
                setActionMode(false)
            } else if (key.leftArrow) {
                setSelectedActionIndex((prev) => Math.max(prev - 1, 0))
            } else if (key.rightArrow) {
                setSelectedActionIndex((prev) => Math.min(prev + 1, (actions?.length || 1) - 1))
            } else if (key.escape) {
                setActionMode(false)
            }
            return
        }

        if (hasActions && isActionKey(input, key)) {
            setActionMode(true)
            return
        }

        if (key.return && serverProcess?.stdin) {
            serverProcess.stdin.write(query + '\n')
            setQuery('')
        }
    })

    // 标题(1行) + marginTop(1行) = 2行，所以实际可显示的输出行数要减2
    const actualOutputLines = maxOutputHeight - 2
    const displayedOutput = output.slice(-actualOutputLines)

    // 移除 ANSI 颜色代码来准确计算可见字符长度
    const stripAnsi = (str: string) => str.replace(/\x1b\[[0-9;]*m/g, '')

    return (
        <Box flexDirection='column' width={width} alignItems='center'>
            {/* 服务器输出区域 */}
            <Box borderStyle='round' flexDirection='column' width={boxWidth} height={maxOutputHeight} paddingX={1}>
                <Text bold color="green">Server Output</Text>
                <Box flexDirection='column' marginTop={1}>
                    {displayedOutput.map((line, index) => {
                        // 边框(2) + paddingX(2) = 4，再预留一点安全边距
                        const maxLineWidth = boxWidth - 4
                        const visibleText = stripAnsi(line)
                        const truncatedLine = visibleText.length > maxLineWidth
                            ? visibleText.substring(0, maxLineWidth - 3) + '...'
                            : line
                        return <Text key={index} wrap='truncate'>{truncatedLine}</Text>
                    })}
                </Box>
            </Box>

            {hasActions && (
                <Box width={boxWidth} paddingX={1} marginTop={1} flexDirection="column">
                    <Box flexDirection="row" gap={2}>
                        {actions!.map((action, index) => (
                            <Text key={action.value} inverse={actionMode && index === selectedActionIndex}>
                                {action.label}
                            </Text>
                        ))}
                    </Box>
                    <Box marginTop={1}>
                        <Text dimColor>
                            Tab to toggle actions, ←/→ to choose, Tab to apply, Esc to cancel
                        </Text>
                    </Box>
                </Box>
            )}

            {/* 命令输入区域 */}
            <Box borderStyle='round' width={boxWidth} paddingX={1} paddingY={0}>
                <Text dimColor>→ </Text>
                <TextInput
                    value={query}
                    onChange={setQuery}
                    focus={!actionMode}
                    placeholder="Enter command and press enter, 'help' for help."
                />
            </Box>
        </Box>
    )
}
