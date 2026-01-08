import React from "react";
import SelectInput from "ink-select-input";

interface VersionData {
    name: string,
    version: string,
    type: string,
    serverJar: string,
    initialized: boolean,
    createdAt: string
}


export default function Mods({ versionData }: { versionData: VersionData }) {
    const items = [
		{ label: 'Start the instance', value: 'start' },
		{ label: 'Go to directory', value: 'dir' },
    ]

    const handleSelect = (item: { label: string; value: string }) => {
		console.log('Selected:', item.value);
		console.log('Version data:', versionData);
    }

    return (
        <>
            <SelectInput items={items} onSelect={handleSelect} />
        </>
    )
}