import React from "react";
import { Box, Text } from "ink";

type ProgressBarProps = {
    downloadedBytes: number;
    totalBytes: number;
};

export default function ProgressBar({ downloadedBytes, totalBytes }: ProgressBarProps) {
    const percent = totalBytes > 0 ? downloadedBytes / totalBytes : 0;
    const barWidth = 30;
    const filled = Math.max(0, Math.min(barWidth, Math.round(barWidth * percent)));
    const empty = Math.max(0, barWidth - filled);
    const barText = `[${'#'.repeat(filled)}${' '.repeat(empty)}] ${Math.floor(percent * 100)
        .toString()
        .padStart(3, ' ')}%`;

    return (
        <Box>
            <Text>{barText}</Text>
        </Box>
    );
}
