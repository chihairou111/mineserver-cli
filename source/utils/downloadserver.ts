import fs from "fs/promises"
import path from "path"
import crypto from "crypto"
import { Readable } from "stream"
import type { ReadableStream } from "stream/web"

type ProgressHandler = (downloadedBytes: number, totalBytes: number) => void

export async function downloadServer(
    url: string,
    version: string,
    type: string,
    name: string,
    maxMemory: string = "2G",
    onProgress?: ProgressHandler
) {
    const serverDir = path.join(
        process.cwd(), 
        "data",
        "versions",
        name
    )

    const fileName = type === "fabric" ? "fabric-installer.jar" : "server.jar"

    const serverJarPath = path.join(
        serverDir,
        fileName
    )

    const metaPath = path.join(
        serverDir,
        "meta.json"
    )

    await fs.mkdir(serverDir, { recursive: true })

    const { downloadUrl, expectedSha1 } = await resolveDownloadTarget(new URL(url))

    const { totalBytes, downloadedBytes } = await streamDownloadToFile(
        downloadUrl,
        serverJarPath,
        expectedSha1,
        onProgress
    )

    const meta = {
        name: name,
        version: version,
        type: type,
        maxMemory: maxMemory,
        serverJar: fileName,
        sourceUrl: downloadUrl,
        downloaded: true,
        initialized: false,
        createdAt: new Date().toISOString()
    }

    await fs.writeFile(
        metaPath,
        JSON.stringify(meta, null, 2),
        "utf-8"
    )

    return { totalBytes, downloadedBytes }
    
}

async function resolveDownloadTarget(url: URL): Promise<{ downloadUrl: string, expectedSha1?: string }> {
    const res = await fetch(url)
    const contentType = res.headers.get("content-type") || ""

    if (contentType.includes("application/json")) {
        const versionJson = await res.json()
        const serverInfo = versionJson.downloads?.server

        if (!serverInfo?.url || !serverInfo?.sha1) {
            throw new Error("Version metadata missing server download info")
        }

        return { downloadUrl: serverInfo.url, expectedSha1: serverInfo.sha1 }
    }

    return { downloadUrl: url.toString() }
}

async function streamDownloadToFile(
    url: string,
    destinationPath: string,
    expectedSha1?: string,
    onProgress?: ProgressHandler,
    maxRetries = 3
): Promise<{ totalBytes: number, downloadedBytes: number }> {
    let lastError: unknown

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await streamOnce(url, destinationPath, expectedSha1, onProgress)
        } catch (err) {
            lastError = err

            if (attempt === maxRetries) {
                if (err instanceof Error) throw err
                throw new Error("Download failed with unknown error")
            }
        }
    }

    throw lastError instanceof Error ? lastError : new Error("Unexpected download error")
}

async function streamOnce(
    url: string,
    destinationPath: string,
    expectedSha1?: string,
    onProgress?: ProgressHandler
): Promise<{ totalBytes: number, downloadedBytes: number }> {
    const res = await fetch(url)

    if (!res.ok || !res.body) {
        throw new Error(`Failed to download file: ${res.status} ${res.statusText}`)
    }

    const totalBytes = Number(res.headers.get("content-length")) || 0
    const fileHandle = await fs.open(destinationPath, "w")
    const hash = expectedSha1 ? crypto.createHash("sha1") : null

    let downloadedBytes = 0
    let streamError: unknown

    try {
        const stream = Readable.fromWeb(res.body as unknown as ReadableStream)

        for await (const chunk of stream) {
            const bufferChunk = chunk as Buffer
            downloadedBytes += bufferChunk.length
            hash?.update(bufferChunk)
            await fileHandle.write(bufferChunk)
            onProgress?.(downloadedBytes, totalBytes)
        }
    } catch (err) {
        streamError = err
    } finally {
        await fileHandle.close()
    }

    if (streamError) {
        await fs.rm(destinationPath, { force: true })
        throw streamError
    }

    if (hash) {
        const digest = hash.digest("hex")
        if (digest !== expectedSha1) {
            await fs.rm(destinationPath, { force: true })
            throw new Error("Downloaded file failed SHA1 validation")
        }
    }

    return { totalBytes, downloadedBytes }
}
