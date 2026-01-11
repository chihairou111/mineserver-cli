import SelectInput from "ink-select-input";
import React, { useEffect, useState } from "react";
import { Text, Box, useInput } from "ink";
import open from "open";
import path from 'path'
import Spinner from "ink-spinner";
import { ChildProcess } from "child_process";

import { startInstance } from "../../utils/startinstance.js";
import OutputWindow from "../../utils/startinstance.js";
import AddMod from "../addmod.js";
import ViewMods from "../viewmods.js";
import Edit from "../../utils/edit.js";

interface VersionData {
    name: string,
    version: string,
    type: string,
    serverJar: string,
    initialized: boolean,
    createdAt: string
}

interface MenuItem {
    label: string;
    value: string;
    description?: string;
}

export default function Mods({
    versionData,
    onExit
}: {
    versionData: VersionData
    onExit: () => void
}) {
    const items: MenuItem[] = [
		{
            label: 'Start the instance',
            value: 'start',
            description: 'Launch the Minecraft server'
        },
		{
            label: 'Go to directory',
            value: 'dir',
            description: 'Open server folder in your file system'
        },
		{
            label: 'Edit the instance',
            value: 'edit',
            description: 'Edit the properties of the instance'
        },
        {
            label: 'Add mods',
            value: 'addmod',
            description: 'Add mods to the instance'
        },
        {
            label: 'View mods',
            value: 'viewmods',
            description: 'View and delete installed mods'
        }
    ]

    const serverStoppedItems: MenuItem[] = [
        {
            label: 'Restart server',
            value: 'restart',
            description: 'Restart the Minecraft server'
        },
        {
            label: 'Back to main menu',
            value: 'back',
            description: 'Return to instance selection'
        }
    ]

    const handleSelect = async (item: MenuItem) => {
        if (item.value === 'start') {
            try {
                await startInstance(
                    dirPath,
                    versionData.initialized,
                    setInitialized,
                    versionData.serverJar,
                    // ========== 服务器启动后 (Server Running) ==========
                    // 实时输出回调：服务器进程已启动，正在处理输出
                    (output) => {
                        // 按行分割输出，过滤空行
                        const lines = output.split('\n').filter(line => line.trim() !== '')
                        setServerOutput(prev => [...prev, ...lines])

                        // 检测服务器完全启动
                        if (
                            output.includes('All dimensions are saved') ||
                            output.includes('Done (') ||
                            output.includes('For help, type "help"')
                        ) {
                            setServerRunning('running')
                        }
                    },
                    // ========== 服务器启动后 (Server Running) ==========
                    // 进程实例回调：服务器进程已启动，保存进程引用
                    setServerProcess,
                    // ========== 服务器启动前/错误处理 (Pre-Launch/Error) ==========
                    // 错误回调：服务器启动失败或初始化错误，返回首页
                    () => {
                        setInitialized(null)
                        setServerOutput([])
                        setServerProcess(null)
                        setServerRunning('starting')
                    }
                )
            } catch (error) {
                console.error('Failed to start instance:', error)
            }
        }
        if (item.value === 'dir') {
            open(dirPath).catch((err: string) => {
                console.error(err)
            })
        }
        if (item.value === 'edit') {
            setShowEdit(true)
        }
        if (item.value === 'addmod') {
            setShowAddMod(true)
        }
        if (item.value === 'viewmods') {
            setShowViewMods(true)
        }
    }

    const handleServerStoppedSelect = async (item: MenuItem) => {
        if (item.value === 'restart') {
            // ========== 服务器启动前 (Pre-Launch) ==========
            // 重启服务器：先停止运行中的服务器进程
            serverProcess?.kill()
            setServerProcess(null)
            setServerOutput([])
            setServerRunning('starting')

            // 重新启动服务器
            try {
                await startInstance(
                    dirPath,
                    true, // 已经初始化过了
                    setInitialized,
                    versionData.serverJar,
                    // ========== 服务器启动后 (Server Running) ==========
                    // 实时输出回调：服务器进程已启动，正在处理输出
                    (output) => {
                        const lines = output.split('\n').filter(line => line.trim() !== '')
                        setServerOutput(prev => [...prev, ...lines])
                        if (
                            output.includes('All dimensions are saved') ||
                            output.includes('Done (') ||
                            output.includes('For help, type "help"')
                        ) {
                            setServerRunning('running')
                        }
                    },
                    // ========== 服务器启动后 (Server Running) ==========
                    // 进程实例回调：服务器进程已启动，保存进程引用
                    setServerProcess,
                    // ========== 服务器启动前/错误处理 (Pre-Launch/Error) ==========
                    // 错误回调：服务器启动失败或初始化错误，返回首页
                    () => {
                        setInitialized(null)
                        setServerOutput([])
                        setServerProcess(null)
                        setServerRunning('starting')
                    }
                )
            } catch (error) {
                console.error('Failed to restart instance:', error)
            }
        }
        if (item.value === 'back') {
            // ========== 服务器启动后 (Server Running) ==========
            // 回到主页：终止运行中的服务器进程
            serverProcess?.kill()
            setServerProcess(null)
            setServerOutput([])
            setServerRunning('starting')
            setInitialized(null)
        }
    }

    const [initialized, setInitialized] = useState<boolean | null>(null)
    const [serverOutput, setServerOutput] = useState<string[]>([])
    const [serverProcess, setServerProcess] = useState<ChildProcess | null>(null)
    const [serverRunning, setServerRunning] = useState<'starting' | 'running' | 'stopped'>('starting')
    const [showAddMod, setShowAddMod] = useState<boolean>(false)
    const [showViewMods, setShowViewMods] = useState<boolean>(false)
    const [showEdit, setShowEdit] = useState<boolean>(false)

    const dirPath = path.join(process.cwd(), "data", "versions", versionData.name)

    const ItemComponent = ({ isSelected, label }: { isSelected?: boolean; label: string }) => {
        const item = items.find(i => i.label === label);

        return (
            <Box flexDirection="column" marginBottom={1}>
                <Text color={isSelected ? 'cyan' : undefined}>
                    {label}
                </Text>
                {item?.description && (
                    <Text dimColor>{item.description}</Text>
                )}
            </Box>
        );
    };

    useEffect(() => {
        if (!serverProcess) return
        const handleClose = () => {
            setServerRunning('stopped')
        }
        serverProcess.once('close', handleClose)
        return () => {
            serverProcess.off('close', handleClose)
        }
    }, [serverProcess])

    useInput((_input, key) => {
        if (key.escape && !showAddMod && !showViewMods && !showEdit) {
            onExit()
        }
    }, { isActive: !showAddMod && !showViewMods && !showEdit })

    // Don't render menu if showing AddMod, ViewMods, or Edit
    if (showEdit) {
        return (
            <Box width='100%' flexDirection="column" gap={1}>
                <Edit name={versionData.name} />
            </Box>
        )
    }
    if (showAddMod) {
        return (
            <Box width='100%' flexDirection="column" gap={1}>
                <AddMod
                    minecraftVersion={versionData.version}
                    modLoader={versionData.type}
                    serverName={versionData.name}
                    onExit={() => setShowAddMod(false)}
                />
            </Box>
        )
    }
    if (showViewMods) {
        return (
            <Box width='100%' flexDirection="column" gap={1}>
                <ViewMods
                    serverName={versionData.name}
                    onExit={() => setShowViewMods(false)}
                />
            </Box>
        )
    }

    return (
        <>
            <Box width='100%' flexDirection="column" gap={1}>
                {(initialized === null) && (
                    <Box>
                        <SelectInput
                            items={items}
                            onSelect={handleSelect}
                            itemComponent={ItemComponent}
                        />
                    </Box>
                )}
                {(initialized === false) && (
                    <Box flexDirection="row" gap={1}>
                        <Spinner type="dots" />
                        <Text color="yellow">Initializing server...</Text>
                    </Box>
                )}
                {(initialized === true && serverRunning === 'starting') && (
                    <Box>
                        <OutputWindow output={serverOutput} serverProcess={serverProcess} />
                    </Box>
                )}
                {(initialized === true && serverRunning === 'running') && (
                    <Box flexDirection="column">
                        <OutputWindow
                            output={serverOutput}
                            serverProcess={serverProcess}
                            actions={[
                                { label: 'Stop', value: 'stop', command: 'stop', immediate: true },
                                { label: 'Ban', value: 'ban', command: 'ban' },
                                { label: 'Pardon', value: 'pardon', command: 'pardon' },
                                { label: 'Kick', value: 'kick', command: 'kick' },
                                { label: 'Back', value: 'back' },
                                { label: 'Input', value: 'input' }
                            ]}
                            onAction={(value) => {
                                if (value === 'back') {
                                    serverProcess?.kill()
                                    setServerProcess(null)
                                    setServerOutput([])
                                    setServerRunning('starting')
                                    setInitialized(null)
                                }
                            }}
                        />
                    </Box>
                )}
                {(initialized === true && serverRunning === 'stopped') && (
                    <Box flexDirection="column">
                        <OutputWindow output={serverOutput} serverProcess={serverProcess} />
                        <Box marginTop={1} paddingX={2}>
                            <Text bold color="yellow">Server stopped. Choose an action:</Text>
                        </Box>
                        <Box marginTop={1} paddingX={2}>
                            <SelectInput
                                items={serverStoppedItems}
                                onSelect={handleServerStoppedSelect}
                                itemComponent={ItemComponent}
                            />
                        </Box>
                    </Box>
                )}
            </Box>
        </>
    )
}
