import fs from 'fs/promises'
import path from 'path'
import { vanillaInitialize } from './initialize/vanillainitialize.js'
import { fabricInitialize } from './initialize/fabricinitialize.js'
import { forgeInitialize } from './initialize/forgeinitialize.js'

interface Meta {
    version: string,
    type: string,
    serverJar: string,
    sourceUrl: string,
    downloaded: string,
    createdAt: string,
}

export async function initialization(dir: string) {
    const metaPath = path.join(dir, "meta.json")

    try {
        await fs.access(metaPath)
        const raw = await fs.readFile(metaPath, "utf-8")
        const meta = JSON.parse(raw) as Meta
        
        if (meta.type === 'vanilla') {
            await vanillaInitialize(dir)
        }
        if (meta.type === 'fabric') {
            fabricInitialize(dir)
        }
        if (meta.type === 'forge') {
            await forgeInitialize(dir)
        }
        if (meta.type === 'paper') {
            // TODO
        }
        return meta
    } catch {
        return null
    }
}
