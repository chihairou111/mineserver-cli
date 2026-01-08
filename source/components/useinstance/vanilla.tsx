import SelectInput from "ink-select-input";
import React, { useState } from "react";
import { Text, Box } from "ink";
import open from "open";
import path from 'path'
import Spinner from "ink-spinner";
import { ChildProcess } from "child_process";

import { startInstance } from "../../utils/startinstance.js";
import OutputWindow from "../../utils/startinstance.js";

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

export default function Vanilla({ versionData }: { versionData: VersionData }) {
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
        console.log('handleSelect called with:', item.value)
        if (item.value === 'start') {
            console.log('Starting instance...')
            console.log('dirPath:', dirPath)
            console.log('versionData.initialized:', versionData.initialized)
            console.log('versionData.serverJar:', versionData.serverJar)
            try {
                await startInstance(
                    dirPath,
                    versionData.initialized,
                    setInitialized,
                    versionData.serverJar,
                    (output) => {
                        // 按行分割输出，过滤空行
                        const lines = output.split('\n').filter(line => line.trim() !== '')
                        setServerOutput(prev => [...prev, ...lines])

                        // 检测服务器完全启动
                        if (output.includes('All dimensions are saved')) {
                            setServerRunning('running')
                        }
                    },
                    setServerProcess,
                    () => {
                        // 错误回调：返回首页
                        setInitialized(null)
                        setServerOutput([])
                        setServerProcess(null)
                        setServerRunning('starting')
                    }
                )
                console.log('startInstance completed')
            } catch (error) {
                console.error('Failed to start instance:', error)
            }
        }
        if (item.value === 'dir') {
            open(dirPath).catch((err: string) => {
                console.error(err)
            })
        }
    }

    const handleServerStoppedSelect = async (item: MenuItem) => {
        if (item.value === 'restart') {
            // 重启服务器：先停止，然后重新启动
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
                    (output) => {
                        const lines = output.split('\n').filter(line => line.trim() !== '')
                        setServerOutput(prev => [...prev, ...lines])
                        if (output.includes('All dimensions are saved')) {
                            setServerRunning('running')
                        }
                    },
                    setServerProcess,
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
            // 回到主页
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
                {(initialized === true && serverRunning !== 'running') && (
                    <Box>
                        <OutputWindow output={serverOutput} serverProcess={serverProcess} />
                    </Box>
                )}
                {(initialized === true && serverRunning === 'running') && (
                    <Box flexDirection="column">
                        <OutputWindow output={serverOutput} serverProcess={serverProcess} />
                        <Box marginTop={1} paddingX={2}>
                            <Text bold color="yellow">Server is running! Choose an action:</Text>
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