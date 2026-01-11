# Mineserver CLI

> An interactive, modern CLI tool tailored for managing local Minecraft server instances with ease. Built with [Ink](https://github.com/vadimdemedes/ink) and [React](https://reactjs.org/).

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node Version](https://img.shields.io/badge/node-%3E%3D16-green.svg)

## ✨ Features

- **Interactive UI**: No more memorizing commands. Navigate with arrow keys and Enter.
- **Multi-Loader Support**:
  - **Vanilla**: Automated download of any release version.
  - **Fabric**: Auto-install fabric loader and dependencies.
  - **Forge**: (Beta) Easy setup for Forge modded servers.
- **Performance Control**:
  - **Smart RAM Allocation**: Specify max memory (e.g., `4G`) during creation to prevent `OutOfMemoryError`.
- **Zero-Friction Setup**:
  - Automatic EULA acceptance.
  - Automatic directory management (`data/versions/`).
- **Process Management**:
  - Start servers directly from the CLI.
  - View real-time server logs with color support.
  - Send commands to the server console interactively.

## 📦 Installation

Ensure you have [Node.js](https://nodejs.org/) (v16 or higher) and [Java](https://adoptium.net/) installed.

```bash
# Install globally via npm
npm install -g mineserver-cli

# Or run directly via npx
npx mineserver-cli
```

## 🚀 Usage

Simply run the command to start the interactive wizard:

```bash
mineserver
```

### 1. Create a New Server

Select **"Create a new instance"** from the main menu.

1.  **Name**: Enter a unique name for your server folder.
2.  **Type**: Choose `Vanilla` or `Mod` (Fabric/Forge).
3.  **Version**: Select the Minecraft version (e.g., `1.20.4`).
4.  **RAM**: Enter the maximum RAM to allocate (e.g., `4` for 4GB).
    - _Tip_: For modded servers, we recommend at least 4GB.

The CLI will download the server jar, install loaders (if applicable), and initialize the `meta.json` config.

### 2. Manage Existing Servers

Select **"Use an existing instance"** to view your library.

- **Start**: Launches the server.
- **Console**: Once running, you can type Minecraft commands (e.g., `op <player>`, `stop`) directly into the CLI input bar.
- **Logs**: Server output is streamed in real-time.

## 🔧 Configuration

Server metadata is stored in `data/versions/<instance_name>/meta.json`.

```json
{
	"name": "my-survival-world",
	"version": "1.20.4",
	"type": "fabric",
	"maxMemory": "4G", // <--- You can edit this manually if needed
	"serverJar": "fabric-server-launch.jar",
	"initialized": true
}
```

## 🛠 Development

Want to contribute?

1.  Clone the repo:
    ```bash
    git clone https://github.com/chihairou111/mineserver-cli.git
    cd mineserver-cli
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run in dev mode:
    ```bash
    npm run dev
    ```

## 📄 License

MIT © [chihairou111](https://github.com/chihairou111)
