<a href="https://github.com/3899/EcoPaste-Pro">
  <img src="https://socialify.git.ci/3899/EcoPaste-Pro/image?description=1&descriptionEditable=%E4%B8%93%E4%B8%BA%20Windows%20%E6%89%93%E9%80%A0%E7%9A%84%E5%BC%80%E6%BA%90%E5%89%AA%E8%B2%B4%E6%9D%BF%E7%AE%A1%E7%90%86%E5%B7%A5%E5%85%B7%E3%80%82&font=Source%20Code%20Pro&logo=https%3A%2F%2Fgithub.com%2FEcoPasteHub%2FEcoPaste%2Fblob%2Fmaster%2Fpublic%2Flogo.png%3Fraw%3Dtrue&name=1&owner=1&pattern=Floating%20Cogs&theme=Auto" alt="EcoPaste" />
</a>

<div align="center">
  <br/>

  <div>
      简体中文 | <a href="./README.zh-TW.md">繁體中文</a> | <a href="./README.en-US.md">English</a> | <a href="./README.ja-JP.md">日本語</a>
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

# EcoPaste-Pro - 专为 Windows 打造的智能剪贴板管理中枢

> **🌟 分支说明**：本仓库是 [EcoPasteHub/EcoPaste](https://github.com/EcoPasteHub/EcoPaste) 的 Fork 增强分支。在官方原版基础上，专为 **Windows** 桌面环境深度重构，全面升级了跨设备数据同步、WebDAV 资产级安全云备份、全景存储统计大盘与智能空间管家，并重构了 12 类内容智能分类识别引擎与日常交互的沉浸式体验。

EcoPaste-Pro 基于 **Tauri v2** 与 **React 18** 构建，深度融合 Win32 原生系统能力，具备极低资源占用、瞬时呼出与原生级系统融合度。坚持数据 100% 本地留存与 Windows 凭据管理器硬件级加密，让剪贴板成为您在 Windows 平台高效心流工作的第二大脑。

---

## 📖 文档导航

* 🚀 **[安装与配置指南](./docs/install.md)**：Windows 安装步骤、Win+V 原生无缝接管、鼠标中键控制与快捷键方案。
* 📜 **[版本更新记录](./docs/changelog.md)**：从 Pro.5.x 到 M01.x 各阶段完整更新履历、特性发布与 Bug 修复明细。
* ⚙️ **[运行环境与数据存储](./docs/environment.md)**：Windows 运行环境、SQLite 数据库模型、Windows 凭据安全存储与自动收缩维护。
* 🛠️ **[开发者指南](./docs/developer.md)**：Tauri v2 + React 18 工程目录结构、本地编译构建流程、Win32 核心 Rust 插件深度剖析。
* 🔄 **[数据同步与移动端指南](./docs/sync.md)**：局域网 HTTP 自动接收 API 规范、主动 Webhook 推送策略、防回环算法与安卓 Tasker 互通配置。

---

## ✨ 核心特性全景

| 功能模块 | 核心能力亮点 |
| :--- | :--- |
| 📋 **智能类型识别矩阵** | 覆盖纯文本、富文本、HTML、图片、文件、Markdown、链接、路径、代码、邮箱、颜色、指令 **12 大内容分类**；内置办公表格复合数据四维探测引擎、SVG 智能解析、代码语法高亮与 CMYK/RGB 颜色实时提取。 |
| 🖥️ **双布局与沉浸式交互** | 提供「经典顶栏」与全新「侧边导航」双视图；支持 **Windows 不夺焦静默粘贴模式**（编辑不中断、双击即粘贴）；支持 **鼠标中键全局控制**、**双击修饰键（Ctrl/Alt/Shift）唤醒** 与 **Win+V 原生无缝接管**。 |
| 📊 **全景存储空间管家** | 独创多维存储大盘，直观透视 12 类数据体积分布；采用开方平滑算法平衡长尾数据；支持全局时间线智能过滤、按类型一键清理并**深度联动删除本地图片文件**，配套 SQLite 自动收缩（Auto VACUUM）。 |
| ☁️ **WebDAV 资产级云备份** | 支持坚果云、NextCloud 等私有云；解耦「完整备份」与「精简备份」双规则；内置**定时 / 间隔 / Cron 表达式**自动化调度引擎；服务器密码采用 Windows 凭据管理器（DPAPI 硬件级加密）安全存储。 |
| 📱 **多端互联与轻量同步** | 内置本地 HTTP 接收服务（`POST /api/write`），支持手机通过自动化工具（Tasker / Shortcuts）直接写入 PC 剪贴板；配备**防同步回环指纹保护**与 5 种图片中转策略，支持仅收藏推送与自定义标签推送。 |
| 🔒 **纯本地隐私与数据安全** | 坚持严格的本地优先原则，零网络遥测与用户行为探针；底层数据库采用单一事实来源设计，具备极佳的跨版本向下兼容与容错能力。 |

---

## 🖼️ 界面预览

<div align="center">
  <h4>剪贴板主窗口 (侧边导航与分类筛选)</h4>
  <img src="./static/Clipboard.png" width="92%" alt="Clipboard" />
  <br/><br/>

  <h4>偏好设置 - 剪贴板与窗口模式</h4>
  <img src="./static/Settings - Clipboard.png" width="92%" alt="Settings Clipboard" />
  <br/><br/>

  <h4>全景存储统计 - 多维空间分析与时间线</h4>
  <img src="./static/Settings - Storage Statistics.png" width="92%" alt="Storage Statistics" />
  <br/><br/>

  <h4>偏好设置 - 快捷键录制与中键控制</h4>
  <img src="./static/Settings - Shortcuts.png" width="92%" alt="Shortcuts" />
  <br/><br/>

  <h4>数据备份 - WebDAV 云端备份与调度</h4>
  <img src="./static/Settings - Data Backup.png" width="92%" alt="Data Backup" />
  <br/><br/>

  <h4>数据同步 - 局域网接收与 Webhook 推送</h4>
  <img src="./static/Settings - Data Sync.png" width="92%" alt="Data Sync" />
</div>

---

## 📥 下载与快速开始

### 🔗 本 Fork 增强分支
- 🚀 **最新构建下载**：[前往 GitHub Releases 下载 Windows 最新安装包](https://github.com/3899/EcoPaste-Pro/releases/latest)
- 📖 **配置与使用手册**：
  - [Windows 安装与配置指南](./docs/install.md)
  - [安卓手机 Tasker 同步指南](./docs/Android/README.md)

### 🔗 官方原版
- 🌐 GitHub 主页：[EcoPasteHub/EcoPaste](https://github.com/EcoPasteHub/EcoPaste)
- 📥 官方下载：[EcoPaste Releases](https://github.com/EcoPasteHub/EcoPaste/releases)
- 📚 官方文档：[EcoPaste 官网](https://ecopaste.cn/)

---

## 🤝 社区交流与问题反馈

1. 🔍 **常见问题排查**：建议优先查阅 [安装与配置指南](./docs/install.md) 或浏览已有 [Issues 讨论](https://github.com/3899/EcoPaste-Pro/issues)。
2. ❓ **提交 Issue**：如遇到 Bug、异常崩溃或有新功能构想，欢迎[提交新的 Issue](https://github.com/3899/EcoPaste-Pro/issues/new/choose)，请尽可能附上系统版本（Windows 10/11）、复现步骤及运行日志，以便快速定位。

---

## 📄 开源许可与致谢

- 本项目基于 [GPL-3.0 许可证](./LICENSE) 开源。
- 感谢上游核心项目 [EcoPasteHub/EcoPaste](https://github.com/EcoPasteHub/EcoPaste) 提供的出色设计与底座支持。
- 本项目中“独立群组与颜色直出”、“二次沉浸编辑”、“高亮代码语法预览”、“数据来源截取”与“原生快速访问”等功能思路借鉴自 [EcoPaste-Sync](https://github.com/Ruszero01/EcoPaste-Sync)，特此鸣谢！
