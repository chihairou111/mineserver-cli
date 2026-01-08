import React, { useEffect, useState } from "react"
import { Box, Text, useInput } from "ink"
import TextInput from "ink-text-input"
import path from "path"
import propertiesReader from 'properties-reader'
import fs from "fs/promises"

interface propertiesType {
    difficulty: string | null,
    hardcore: string | null,
    "level-seed": string | null,
    "level-name": string | null,
    "max-players": string | null,
    motd: string | null,
    "online-mode": string | null,
    "white-list": string | null
}

// 自定义 Item 组件
const EditableItem = ({ isSelected, label, value }: any) => {
    return (
        <Text inverse={isSelected}>
            {label}: {value}
        </Text>
    )
}

export default function Edit({ name }: { name: string }) {

    const [properties, setProperties] = useState<propertiesType>()
    const [editingKey, setEditingKey] = useState<string | null>(null)
    const [editValue, setEditValue] = useState<string>('')
    const [selectedIndex, setSelectedIndex] = useState<number>(0)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    useEffect(() => {
        const loadProperties = async () => {
            const propertiesDir = path.join(process.cwd(), 'data', 'versions', name, 'server.properties')
            const properties = propertiesReader(propertiesDir)

            const toString = (val: any) => {
                if (val === null || val === undefined || val === '') return '(empty)'
                return String(val)
            }

            setProperties({
                difficulty: toString(properties.get('difficulty')),
                hardcore: toString(properties.get('hardcore')),
                "level-seed": toString(properties.get('level-seed')),
                "level-name": toString(properties.get('level-name')),
                "max-players": toString(properties.get('max-players')),
                motd: toString(properties.get('motd')),
                "online-mode": toString(properties.get('online-mode')),
                "white-list": toString(properties.get('white-list'))
            })
        }

        loadProperties()
    }, [])

    useInput((_input, key) => {
        const items = getItems()
        if (key.return && items[selectedIndex]) {
            // 按 Enter 进入编辑模式
            const currentItem = items[selectedIndex]
            setEditingKey(currentItem.value)
            // 如果是 (empty)，清空输入框
            const valueToEdit = currentItem.displayValue === '(empty)' ? '' : String(currentItem.displayValue || '')
            setEditValue(valueToEdit)
        } else if (key.upArrow && selectedIndex > 0) {
            setSelectedIndex(selectedIndex - 1)
        } else if (key.downArrow && selectedIndex < items.length - 1) {
            setSelectedIndex(selectedIndex + 1)
        }
    }, { isActive: !editingKey })

    // 单独的 hook 处理编辑模式下的 Esc
    useInput((_input, key) => {
        if (editingKey && key.escape) {
            setEditingKey(null)
            setEditValue('')
            setErrorMessage(null) // 清除错误消息
        }
    }, { isActive: !!editingKey })

    const getItems = () => {
        if (!properties) return []
        return [
            { label: 'Difficulty', value: 'difficulty', displayValue: properties.difficulty },
            { label: 'Hardcore', value: 'hardcore', displayValue: properties.hardcore },
            { label: 'Level Seed', value: 'level-seed', displayValue: properties['level-seed'] },
            { label: 'Level Name', value: 'level-name', displayValue: properties['level-name'] },
            { label: 'Max Players', value: 'max-players', displayValue: properties['max-players'] },
            { label: 'MOTD', value: 'motd', displayValue: properties.motd },
            { label: 'Online Mode', value: 'online-mode', displayValue: properties['online-mode'] },
            { label: 'White List', value: 'white-list', displayValue: properties['white-list'] },
        ]
    }

    const validateValue = (key: string, value: string): { valid: boolean; error?: string } => {
        switch (key) {
            case 'difficulty':
                const validDifficulties = ['peaceful', 'easy', 'normal', 'hard']
                if (!validDifficulties.includes(value.toLowerCase())) {
                    return { valid: false, error: 'Must be: peaceful, easy, normal, or hard' }
                }
                break

            case 'hardcore':
            case 'online-mode':
            case 'white-list':
                if (value.toLowerCase() !== 'true' && value.toLowerCase() !== 'false') {
                    return { valid: false, error: 'Must be: true or false' }
                }
                break

            case 'max-players':
                const num = parseInt(value)
                if (isNaN(num) || num < 1 || num > 2147483647) {
                    return { valid: false, error: 'Must be a number between 1 and 2147483647' }
                }
                break

            case 'level-name':
                if (value.includes('/') || value.includes('\\')) {
                    return { valid: false, error: 'Cannot contain / or \\' }
                }
                break
        }
        return { valid: true }
    }

    const handleSave = async () => {
        // 保存修改 - 手动替换行以保持原格式
        const propertiesDir = path.join(process.cwd(), 'data', 'versions', name, 'server.properties')

        if (editingKey) {
            // 验证输入
            const validation = validateValue(editingKey, editValue)
            if (!validation.valid) {
                // 显示错误，不保存
                setErrorMessage(validation.error || 'Invalid value')
                return
            }

            try {
                // 读取文件内容
                const content = await fs.readFile(propertiesDir, 'utf-8')
                const lines = content.split('\n')

                // 查找并替换目标行
                let replaced = false
                const newLines = lines.map(line => {
                    const trimmed = line.trim()
                    // 跳过注释和空行
                    if (trimmed.startsWith('#') || trimmed === '') return line

                    // 检查是否包含 =
                    if (!trimmed.includes('=')) return line

                    // 检查是否是目标 key
                    const [key] = trimmed.split('=')
                    if (key && key.trim() === editingKey) {
                        replaced = true
                        return `${editingKey}=${editValue}`
                    }
                    return line
                })

                // 如果没找到，添加到文件末尾
                if (!replaced) {
                    newLines.push(`${editingKey}=${editValue}`)
                }

                // 写回文件
                await fs.writeFile(propertiesDir, newLines.join('\n'), 'utf-8')

                // 更新 state
                const displayValue = editValue === '' ? '(empty)' : editValue
                setProperties(prev => prev ? { ...prev, [editingKey]: displayValue } : prev)

                // 延迟退出编辑模式，防止父组件捕获到同一个 Enter 事件
                setTimeout(() => {
                    setEditingKey(null)
                    setEditValue('')
                    setErrorMessage(null) // 清除错误消息
                }, 100)
            } catch (error) {
                console.error('Failed to save properties:', error)
                setErrorMessage('Failed to save properties')
            }
        }
    }

    if (!properties) {
        return <Text>Loading properties...</Text>
    }

    return (
        <Box flexDirection="column">
            <Text>Server Properties (Press Enter to edit, Arrow keys to navigate):</Text>
            {editingKey && <Text dimColor>Editing - Press Enter to save, Esc to cancel</Text>}
            {errorMessage && <Text color="red">{errorMessage}</Text>}
            <Box flexDirection="column" marginTop={1}>
                {getItems().map((item, index) => {
                    const isEditing = editingKey === item.value
                    const isSelected = index === selectedIndex

                    if (isEditing) {
                        return (
                            <Box key={item.value} flexDirection="column">
                                <Box>
                                    <Text>{item.label}: </Text>
                                    <TextInput
                                        value={editValue}
                                        onChange={setEditValue}
                                        onSubmit={handleSave}
                                    />
                                </Box>
                            </Box>
                        )
                    }

                    return (
                        <EditableItem
                            key={item.value}
                            isSelected={isSelected}
                            label={item.label}
                            value={item.displayValue}
                        />
                    )
                })}
            </Box>
        </Box>
    )
}