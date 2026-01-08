import fs from 'fs/promises'
import path from 'path'
import { spawn, spawnSync } from 'child_process'

interface Meta {
    version: string,
    type: string,
    serverJar: string,
    sourceUrl: string,
    downloaded: string,
    initialized: boolean,
    createdAt: string,
}

export async function fabricInitialize(dir: string) {
    const metaPath = path.join(dir, "meta.json")
    const raw = await fs.readFile(metaPath, "utf-8")
    const meta = JSON.parse(raw) as Meta
 
    const jarPath = path.join(dir, meta.serverJar)

    spawnSync("java", [
        "-jar",
        jarPath,
        "server",
        "-mcversion", meta.version,
        "-loader", "latest",
        "-downloadMinecraft",
        ], {
        cwd: dir,
        stdio: ["ignore", "pipe", "pipe"],
    })

    const launchPath = path.join(dir, "fabric-server-launch.jar")

    spawnSync("java", ["-jar", launchPath])

    const eulaPath = path.join(dir, "eula.txt")

    const content = await fs.readFile(eulaPath, "utf-8")

    await fs.writeFile(
        eulaPath,
        content.replace(/eula\s*=\s*false/i, "eula=true")
    )

    const serverProcess = spawn("java", ["-jar", launchPath, "nogui"], {
        cwd: dir,
        stdio: ["pipe", "pipe", "pipe"],
    })

    let stopSent = false

    serverProcess.stdout.on("data", (chunk) => {
        const text = chunk.toString()
        if (!stopSent && text.includes("Done")) {
            stopSent = true
            serverProcess.stdin.write("stop\n")
        }
    })

    await new Promise<void>((resolve, reject) => {
        serverProcess.once("error", reject)
        serverProcess.once("exit", () => resolve())
    })

    meta.serverJar = "fabric-server-launch.jar"
    meta.initialized = true

    await fs.writeFile(
        "meta.json",
        JSON.stringify(meta, null, 2)
    )
}