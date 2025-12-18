import fs from "fs/promises"
import path from "path"
import crypto from "crypto"

export async function downloadServer(url: URL, version: string, type: string) {
    const res = await fetch(url)
    const versionJson = await res.json()
    const serverInfo = versionJson.downloads?.server

    if (!serverInfo?.url || !serverInfo?.sha1) {
        throw new Error("Version metadata missing server download info")
    }

    const serverUrl = serverInfo.url

    const serverDir = path.join(
        process.cwd(), 
        "data",
        "versions",
        version
    )

    const serverJarPath = path.join(
        serverDir,
        "server.jar"
    )

    const metaPath = path.join(
        serverDir,
        "meta.json"
    )

    await fs.mkdir(serverDir, { recursive: true })

    const buffer = await downloadWithSha1Retry(serverUrl, serverInfo.sha1)

    await fs.writeFile(serverJarPath, buffer)

    const meta = {
        version: version,
        type: type,
        serverJar: "server.jar",
        downloaded: true,
        createdAt: new Date().toISOString()
    }

    await fs.writeFile(
        metaPath,
        JSON.stringify(meta, null, 2),
        "utf-8"
    )

    return (true)
    
}

async function downloadWithSha1Retry(url: string, expectedSha1: string, maxRetries = 3): Promise<Buffer> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const res = await fetch(url)
        if (!res.ok) {
            if (attempt === maxRetries) {
                throw new Error(`Failed to download server jar: ${res.status} ${res.statusText}`)
            }
            continue
        }

        const buffer = Buffer.from(await res.arrayBuffer())
        const sha1 = crypto.createHash("sha1").update(buffer).digest("hex")

        if (sha1 === expectedSha1) {
            return buffer
        }

        if (attempt === maxRetries) {
            throw new Error("Downloaded server jar failed SHA1 validation after retries")
        }
    }

    throw new Error("Unexpected download error")
}
