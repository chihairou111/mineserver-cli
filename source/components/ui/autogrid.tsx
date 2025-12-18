import React from "react"
import { useState } from "react"
import { Box, Text, useInput } from "ink"

function chunk<T>(arr: T[], size: number) {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

export function AutoGrid<T extends React.ReactNode>(props: {
  items: T[]
  width: number
  onSelect: (item: T) => void
}) {
  const { items, width } = props
  const itemWidth = 9
  const padding = 1
  const columnGap = 1
  const availableWidth = Math.max(1, width - padding * 2)
  const slotWidth = itemWidth + columnGap
  const columns = Math.max(1, Math.floor((availableWidth + columnGap) / slotWidth))
  const rows = chunk(items, columns)
  const [cursor, setCursor] = useState<number>(0)

	useInput((_, key) => {
		if (key.rightArrow) {
			setCursor(Math.min(cursor + 1, items.length - 1))
		}
		if (key.leftArrow) {
			setCursor(Math.max(cursor - 1, 0))
		}
		if (key.downArrow) {
			setCursor(Math.min(cursor + columns, items.length - 1))
		}
		if (key.upArrow) {
			setCursor(Math.max(cursor - columns, 0))
		}
        if (key.return) {
            const item = items[cursor]
            if (item !== undefined) {
                props.onSelect(item)
            }
        }
	})
  return (
    <Box flexDirection="column" padding={padding}>
      {rows.map((row, rowIndex) => (
        <Box key={rowIndex} gap={columnGap}>
          {row.map((item, colIndex) => {
            const index = rowIndex * columns + colIndex
            const active = index === cursor
            return (
                <Box key={colIndex} width={itemWidth}>
                <Text inverse={active}>{item}</Text>
                </Box>
            )
        })}
        </Box>
      ))}
    </Box>
  )
}
