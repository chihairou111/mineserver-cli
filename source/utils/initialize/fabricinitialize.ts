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

    // 运行 Fabric 安装器（无头模式，后台静默处理）
    spawnSync("java", [
        "-jar",
        jarPath,
        "server",
        "-mcversion", meta.version,
        "-loader", "latest",
        "-downloadMinecraft",
        "-dir", dir
        ], {
        cwd: dir,
        stdio: ["ignore", "pipe", "pipe"],
    })

    const launchPath = path.join(dir, "fabric-server-launch.jar")

    // 第一次运行生成 eula.txt（同步等待完全退出）
    spawnSync("java", ["-jar", launchPath, "nogui"], {
        cwd: dir,
        stdio: ["ignore", "pipe", "pipe"],
    })

    const eulaPath = path.join(dir, "eula.txt")

    const content = await fs.readFile(eulaPath, "utf-8")

    await fs.writeFile(
        eulaPath,
        content.replace(/eula\s*=\s*false/i, "eula=true")
    )

    // 第二次运行：接受 EULA 后完整启动一次服务器
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

    // 等待额外的时间确保所有资源被释放
    await new Promise(resolve => setTimeout(resolve, 2000))

    meta.serverJar = "fabric-server-launch.jar"
    meta.initialized = true

    await fs.writeFile(
        metaPath,
        JSON.stringify(meta, null, 2)
    )
}