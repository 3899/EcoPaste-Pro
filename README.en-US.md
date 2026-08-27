<a href="https://github.com/3899/EcoPaste-Pro">
  <img src="https://socialify.git.ci/3899/EcoPaste-Pro/image?description=1&descriptionEditable=Open%20source%20clipboard%20management%20tool%20tailored%20for%20Windows.&font=Source%20Code%20Pro&logo=https%3A%2F%2Fgithub.com%2FEcoPasteHub%2FEcoPaste%2Fblob%2Fmaster%2Fpublic%2Flogo.png%3Fraw%3Dtrue&name=1&owner=1&pattern=Floating%20Cogs&theme=Auto" alt="EcoPaste" />
</a>

<div align="center">
  <br/>

  <div>
      English | <a href="./README.md">简体中文</a> | <a href="./README.zh-TW.md">繁體中文</a> | <a href="./README.ja-JP.md">日本語</a>
  </div>

  <br/>
    
  <div>
    <a href="https://github.com/3899/EcoPaste-Pro/releases">
      <img
        alt="Windows"
        src="https://img.shields.io/badge/-Windows-blue?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB0PSIxNzI2MzA1OTcxMDA2IiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjE1NDgiIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4Ij48cGF0aCBkPSJNNTI3LjI3NTU1MTYxIDk2Ljk3MTAzMDEzdjM3My45OTIxMDY2N2g0OTQuNTEzNjE5NzVWMTUuMDI2NzU3NTN6TTUyNy4yNzU1NTE2MSA5MjguMzIzNTA4MTVsNDk0LjUxMzYxOTc1IDgwLjUyMDI4MDQ5di00NTUuNjc3NDcxNjFoLTQ5NC41MTM2MTk3NXpNNC42NzA0NTEzNiA0NzAuODMzNjgyOTdINDIyLjY3Njg1OTI1VjExMC41NjM2ODE5N2wtNDE4LjAwNjQwNzg5IDY5LjI1Nzc5NzUzek00LjY3MDQ1MTM2IDg0Ni43Njc1OTcwM0w0MjIuNjc2ODU5MjUgOTE0Ljg2MDMxMDEzVjU1My4xNjYzMTcwM0g0LjY3MDQ1MTM2eiIgcC1pZD0iMTU0OSIgZmlsbD0iI2ZmZmZmZiI+PC9wYXRoPjwvc3ZnPg=="
      />
    </a >
    <a href="./LICENSE">
      <img
        src="https://img.shields.io/github/license/3899/EcoPaste-Pro?style=flat-square"
      />
    </a >
    <a href="https://github.com/3899/EcoPaste-Pro/releases">
      <img
        src="https://img.shields.io/github/package-json/v/3899/EcoPaste-Pro?style=flat-square"
      />
    </a >
    <a href="https://github.com/3899/EcoPaste-Pro/releases">
      <img
        src="https://img.shields.io/github/downloads/3899/EcoPaste-Pro/total?style=flat-square"
      />  
    </a >
  </div>
</div>

# EcoPaste-Pro - Intelligent Clipboard Management Hub Tailored for Windows

> **🌟 Branch Information**: This repository is an enhanced Fork of [EcoPasteHub/EcoPaste](https://github.com/EcoPasteHub/EcoPaste). Tailored specifically for the **Windows** platform, it restructures and introduces cross-device data synchronization, WebDAV secure cloud backup, panoramic storage statistics, and a 12-type intelligent content categorization engine with an immersive user experience.

EcoPaste-Pro is built with **Tauri v2** and **React 18**, deeply integrated with Win32 native capabilities, offering minimal memory footprint, instant hotkey activation, and native desktop integration. Featuring 100% local data storage and Windows Credential Manager hardware-level encryption.

---

## 📖 Documentation Navigation

* 🚀 **[Installation & Configuration Guide](./docs/install.md)**: Windows installation, seamless Win+V takeover, middle-click control, and shortcut recommendations.
* 📜 **[Version Changelog](./docs/changelog.md)**: Detailed historical changelog from Pro.5.x to M01.x, feature releases, and bug fix logs.
* ⚙️ **[Runtime & Data Storage](./docs/environment.md)**: Windows runtime requirements, SQLite database architecture, Windows Credential Manager security, and auto-vacuum maintenance.
* 🛠️ **[Developer Guide](./docs/developer.md)**: Tauri v2 + React 18 project architecture, local build instructions, and Win32 Rust plugin deep dive.
* 🔄 **[Data Sync & Mobile Interoperability](./docs/sync.md)**: Local HTTP receive API specification, Webhook dispatch, anti-loopback algorithm, and Android Tasker integration.

---

## ✨ Core Feature Highlights

| Feature Area | Key Capabilities |
| :--- | :--- |
| 📋 **Intelligent Classification Matrix** | 12 content types (Plain Text, Rich Text, HTML, Image, File, Markdown, Link, Path, Code, Email, Color, Command). 4D detection engine for office table composites, SVG parser, syntax highlighting, and CMYK/RGB color extraction. |
| 🖥️ **Dual Layout & Immersive Flow** | Classic top bar & new sidebar navigation. **Windows No-Focus Silent Paste Mode** (non-disruptive, double-click to paste). **Mouse Middle Click Global Toggle**, **Modifier Key Double-Tap Wakeup**, and **Seamless Win+V Takeover**. |
| 📊 **Panoramic Storage Manager** | Multi-dimensional dashboard analyzing 12 data types. Square-root smoothing algorithm for long-tail balance. Smart timeline filtering, batch cleanup with **deep local image file deletion**, and automatic SQLite VACUUM. |
| ☁️ **WebDAV Cloud Asset Backup** | Full and lite backup separation. Automated scheduling engine supporting **Scheduled time, Interval, and Cron expressions**. Credential encryption backed by Windows Credential Manager (DPAPI). |
| 📱 **Cross-Device Sync & Automation** | Built-in local HTTP server (`POST /api/write`). Supports writing to PC clipboard via mobile automation (Tasker / Shortcuts). Equipped with **Anti-Loopback fingerprint protection** and 5 image transfer strategies. |
| 🔒 **Local Privacy & Robustness** | Strict local-first architecture with zero telemetry or tracking probes. Single-Source-of-Truth database model providing robust backwards compatibility. |

---

## 🖼️ Interface Preview

<div align="center">
  <h4>Main Clipboard Window (Sidebar Navigation & Category Filtering)</h4>
  <img src="./static/Clipboard.png" width="92%" alt="Clipboard" />
  <br/><br/>

  <h4>Preferences - Clipboard & Window Settings</h4>
  <img src="./static/Settings - Clipboard.png" width="92%" alt="Settings Clipboard" />
  <br/><br/>

  <h4>Storage Statistics - Multi-Dimensional Analysis & Timeline</h4>
  <img src="./static/Settings - Storage Statistics.png" width="92%" alt="Storage Statistics" />
  <br/><br/>

  <h4>Preferences - Shortcut Recording & Middle Click Control</h4>
  <img src="./static/Settings - Shortcuts.png" width="92%" alt="Shortcuts" />
  <br/><br/>

  <h4>Data Backup - WebDAV Cloud Backup & Scheduling</h4>
  <img src="./static/Settings - Data Backup.png" width="92%" alt="Data Backup" />
  <br/><br/>

  <h4>Data Sync - Local Receiver & Webhook Dispatch</h4>
  <img src="./static/Settings - Data Sync.png" width="92%" alt="Data Sync" />
</div>

---

## 📥 Downloads & Getting Started

### 🔗 This Fork
- 🚀 **Latest Release Download**: [Download Latest Windows Build from GitHub Releases](https://github.com/3899/EcoPaste-Pro/releases/latest)
- 📖 **Documentation**:
  - [Windows Installation & Configuration Guide](./docs/install.md)
  - [Android Tasker Sync Guide](./docs/Android/README.md)

### 🔗 Upstream Project
- 🌐 GitHub: [EcoPasteHub/EcoPaste](https://github.com/EcoPasteHub/EcoPaste)
- 📥 Releases: [EcoPaste Releases](https://github.com/EcoPasteHub/EcoPaste/releases)
- 📚 Website: [EcoPaste Official Site](https://ecopaste.cn/)

---

## 🤝 Community & Issue Feedback

1. 🔍 **Troubleshooting**: Check the [Installation Guide](./docs/install.md) or browse existing [Issues](https://github.com/3899/EcoPaste-Pro/issues).
2. ❓ **Report Issues**: If you encounter bugs or have feature suggestions, feel free to [Submit an Issue](https://github.com/3899/EcoPaste-Pro/issues/new/choose) with your Windows version (10/11), reproduction steps, and logs.

---

## 📄 License & Acknowledgments

- Licensed under [GPL-3.0 License](./LICENSE).
- Special thanks to the upstream core project [EcoPasteHub/EcoPaste](https://github.com/EcoPasteHub/EcoPaste) for the foundation.
- Ideas for "independent groups", "immersive editing", "code highlighting", and "source app extraction" were inspired by [EcoPaste-Sync](https://github.com/Ruszero01/EcoPaste-Sync).
