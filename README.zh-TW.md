<a href="https://github.com/3899/EcoPaste-Pro">
  <img src="https://socialify.git.ci/3899/EcoPaste-Pro/image?description=1&descriptionEditable=%E5%B0%88%E7%82%BA%20Windows%20%E6%89%93%E9%80%A0%E7%9A%84%E9%96%8B%E6%BA%90%E5%89%AA%E8%B2%BC%E7%B0%BF%E7%AE%A1%E7%90%86%E5%B7%A5%E5%85%B7%E3%80%82&font=Source%20Code%20Pro&logo=https%3A%2F%2Fgithub.com%2FEcoPasteHub%2FEcoPaste%2Fblob%2Fmaster%2Fpublic%2Flogo.png%3Fraw%3Dtrue&name=1&owner=1&pattern=Floating%20Cogs&theme=Auto" alt="EcoPaste" />
</a>

<div align="center">
  <br/>

  <div>
    繁體中文 | <a href="./README.md">简体中文</a> | <a href="./README.en-US.md">English</a> | <a href="./README.ja-JP.md">日本語</a>
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

# EcoPaste-Pro - 專為 Windows 打造的智慧剪貼簿管理中樞

> **🌟 分支說明**：本倉庫是 [EcoPasteHub/EcoPaste](https://github.com/EcoPasteHub/EcoPaste) 的 Fork 增強分支。在官方原版基礎上，專為 **Windows** 桌面環境深度重構，全面升級了跨設備資料同步、WebDAV 資產級安全雲端備份、全景儲存統計大盤與智慧空間管家，並重構了 12 類內容智慧分類識別引擎與日常互動的沉浸式體驗。

EcoPaste-Pro 基於 **Tauri v2** 與 **React 18** 構建，深度融合 Win32 原生系統能力，具備極低資源佔用、瞬間呼出與原生級系統融合度。堅持資料 100% 本地留存與 Windows 憑據管理器硬體級加密，讓剪貼簿成為您在 Windows 平台高效心流工作的第二大腦。

---

## 📖 文件導航

* 🚀 **[安裝與配置指南](./docs/install.md)**：Windows 安裝步驟、Win+V 原生無縫接管、滑鼠中鍵控制與快捷鍵方案。
* 📜 **[版本更新記錄](./docs/changelog.md)**：從 Pro.5.x 到 M01.x 各階段完整更新履歷、特性發布與 Bug 修復明細。
* ⚙️ **[運行環境與資料儲存](./docs/environment.md)**：Windows 運行環境、SQLite 資料庫模型、Windows 憑據安全儲存與自動收縮維護。
* 🛠️ **[開發者指南](./docs/developer.md)**：Tauri v2 + React 18 工程目錄結構、本地編譯構建流程、Win32 核心 Rust 外掛深度剖析。
* 🔄 **[資料同步與行動端指南](./docs/sync.md)**：區域網路 HTTP 自動接收 API 規範、主動 Webhook 推送策略、防回環演算法與安卓 Tasker 互通配置。

---

## ✨ 核心特性全景

| 功能模組 | 核心能力亮點 |
| :--- | :--- |
| 📋 **智慧類型識別矩陣** | 涵蓋純文字、富文字、HTML、圖片、檔案、Markdown、連結、路徑、程式碼、電子郵件、顏色、指令 **12 大內容分類**；內建辦公表格複合資料四維探測引擎、SVG 智慧解析、程式碼語法高亮與 CMYK/RGB 顏色即時提取。 |
| 🖥️ **雙佈局與沉浸式互動** | 提供「經典頂欄」與全新「側邊導航」雙視圖；支援 **Windows 不奪焦靜默貼上模式**（編輯不中斷、按兩下即貼上）；支援 **滑鼠中鍵全域控制**、**按兩下修飾鍵（Ctrl/Alt/Shift）喚醒** 與 **Win+V 原生無縫接管**。 |
| 📊 **全景儲存空間管家** | 獨創多維儲存大盤，直觀透視 12 類資料體積分佈；採用開方平滑演算法平衡長尾資料；支援全域時間線智慧過濾、按類型一鍵清理並**深度連動刪除本機圖片檔案**，配套 SQLite 自動收縮（Auto VACUUM）。 |
| ☁️ **WebDAV 資產級雲端備份** | 支援堅果雲、NextCloud 等私有雲；解耦「完整備份」與「精簡備份」雙規則；內建**定時 / 間隔 / Cron 表達式**自動化排程引擎；伺服器密碼採用 Windows 憑據管理器（DPAPI 硬體級加密）安全儲存。 |
| 📱 **多端互聯與輕量同步** | 內建本機 HTTP 接收服務（`POST /api/write`），支援手機透過自動化工具（Tasker / Shortcuts）直接寫入 PC 剪貼簿；配備**防同步回環指紋保護**與 5 種圖片中轉策略，支援僅收藏推送與自訂標籤推送。 |
| 🔒 **純本地隱私與資料安全** | 堅持嚴格的本機優先原則，零網路遙測與使用者行為探針；底層資料庫採用單一事實來源設計，具備極佳的跨版本向下相容與容錯能力。 |

---

## 🖼️ 介面預覽

<div align="center">
  <h4>剪貼簿主視窗 (側邊導航與分類篩選)</h4>
  <img src="./static/Clipboard.png" width="92%" alt="Clipboard" />
  <br/><br/>

  <h4>偏好設定 - 剪貼簿與視窗模式</h4>
  <img src="./static/Settings - Clipboard.png" width="92%" alt="Settings Clipboard" />
  <br/><br/>

  <h4>全景儲存統計 - 多維空間分析與時間線</h4>
  <img src="./static/Settings - Storage Statistics.png" width="92%" alt="Storage Statistics" />
  <br/><br/>

  <h4>偏好設定 - 快捷鍵錄製與中鍵控制</h4>
  <img src="./static/Settings - Shortcuts.png" width="92%" alt="Shortcuts" />
  <br/><br/>

  <h4>資料備份 - WebDAV 雲端備份與排程</h4>
  <img src="./static/Settings - Data Backup.png" width="92%" alt="Data Backup" />
  <br/><br/>

  <h4>資料同步 - 區域網路接收與 Webhook 推送</h4>
  <img src="./static/Settings - Data Sync.png" width="92%" alt="Data Sync" />
</div>

---

## 📥 下載與快速開始

### 🔗 本 Fork 增強分支
- 🚀 **最新建置下載**：[前往 GitHub Releases 下載 Windows 最新安裝包](https://github.com/3899/EcoPaste-Pro/releases/latest)
- 📖 **配置與使用手冊**：
  - [Windows 安裝與配置指南](./docs/install.md)
  - [安卓手機 Tasker 同步指南](./docs/Android/README.md)

### 🔗 官方原版
- 🌐 GitHub 主頁：[EcoPasteHub/EcoPaste](https://github.com/EcoPasteHub/EcoPaste)
- 📥 官方下載：[EcoPaste Releases](https://github.com/EcoPasteHub/EcoPaste/releases)
- 📚 官方文件：[EcoPaste 官網](https://ecopaste.cn/)

---

## 🤝 社群交流與問題反饋

1. 🔍 **常見問題排查**：建議優先查閱 [安裝與配置指南](./docs/install.md) 或瀏覽已有 [Issues 討論](https://github.com/3899/EcoPaste-Pro/issues)。
2. ❓ **提交 Issue**：如遇到 Bug、異常崩潰或有新功能構想，歡迎[提交新的 Issue](https://github.com/3899/EcoPaste-Pro/issues/new/choose)，請盡可能附上系統版本（Windows 10/11）、重現步驟及運行日誌，以便快速定位。

---

## 📄 開源許可與致謝

- 本專案基於 [GPL-3.0 許可證](./LICENSE) 開源。
- 感謝上游核心專案 [EcoPasteHub/EcoPaste](https://github.com/EcoPasteHub/EcoPaste) 提供的出色設計與底座支援。
- 本專案中“獨立群組與顏色直出”、“二次沉浸編輯”、“高亮程式碼語法預覽”、“資料來源擷取”與“原生快速訪問”等功能思路借鑑自 [EcoPaste-Sync](https://github.com/Ruszero01/EcoPaste-Sync)，特此鳴謝！
