<a href="https://github.com/3899/EcoPaste-Pro">
  <img src="https://socialify.git.ci/3899/EcoPaste-Pro/image?description=1&descriptionEditable=Windows%E5%B0%82%E7%94%A8%E3%81%AE%E3%82%AA%E3%83%BC%E3%83%97%E3%83%B3%E3%82%BD%E3%83%BC%E3%82%B9%E3%82%AF%E3%83%AA%E3%83%83%E3%83%97%E3%83%9C%E3%83%BC%E3%83%89%E7%AE%A1%E7%90%86%E3%83%84%E3%83%BC%E3%83%AB%E3%80%82&font=Source%20Code%20Pro&logo=https%3A%2F%2Fgithub.com%2FEcoPasteHub%2FEcoPaste%2Fblob%2Fmaster%2Fpublic%2Flogo.png%3Fraw%3Dtrue&name=1&owner=1&pattern=Floating%20Cogs&theme=Auto" alt="EcoPaste" />
</a>

<div align="center">
  <br/>

  <div>
      日本語 | <a href="./README.md">简体中文</a> | <a href="./README.zh-TW.md">繁體中文</a> | <a href="./README.en-US.md">English</a>
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

# EcoPaste-Pro - Windows 専用のインテリジェント クリップボード管理ハブ

> **🌟 ブランチの説明**：本リポジトリは [EcoPasteHub/EcoPaste](https://github.com/EcoPasteHub/EcoPaste) の Fork 拡張版です。公式オリジナル版をベースに、**Windows** デスクトップ環境向けに深く再構築。クロスデバイスのデータ同期、WebDAV クラウドデータ資産の安全なバックアップ、パノラマストレージ統計ダッシュボードを大幅にアップグレードし、12種類のコンテンツを自動認識するスマート分類エンジンと没入型の操作体験を提供します。

EcoPaste-Pro は **Tauri v2** と **React 18** で構築されており、Win32 ネイティブ API と緊密に連携。極めて低いリソース消費、瞬時のホットキー呼び出し、OS ネイティブの親和性を誇ります。100% ローカルでのデータ保持と Windows 資格情報マネージャー（DPAPI）によるハードウェア暗号化により、日常の生産性を飛躍的に高めます。

---

## 📖 ドキュメント ナビゲーション

* 🚀 **[インストールと設定ガイド](./docs/install.md)**：Windows でのインストール手順、Win+V のシームレスな乗っ取り、マウス中ボタン制御、おすすめのショートカット構成。
* 📜 **[バージョン更新履歴](./docs/changelog.md)**：Pro.5.x から M01.x までの詳細なリリース履歴、新機能、バグ修正ログ。
* ⚙️ **[実行環境とデータストレージ](./docs/environment.md)**：Windows 動作要件、SQLite データベースモデル、Windows 資格情報マネージャー保護、自動 VACUUM 最適化。
* 🛠️ **[開発者ガイド](./docs/developer.md)**：Tauri v2 + React 18 のプロジェクト構造、ローカルビルド手順、Win32 コア Rust プラグインの内部解説。
* 🔄 **[データ同期とモバイル連携ガイド](./docs/sync.md)**：ローカル HTTP 受信 API 仕様、Webhook 配信、ループ防止アルゴリズム、Android Tasker 連携手順。

---

## ✨ コア機能の全体像

| 機能モジュール | コア機能のハイライト |
| :--- | :--- |
| 📋 **スマート分類マトリックス** | プレーンテキスト、リッチテキスト、HTML、画像、ファイル、Markdown、リンク、パス、コード、メール、カラー、コマンドの **12大カテゴリ** を網羅。オフィス表複合データの4次元検出、SVG 解析、コードハイライト、CMYK/RGB リアルタイム抽出。 |
| 🖥️ **デュアルレイアウト & 没入操作** | 「クラシックトップバー」と新登場の「サイドバーナビゲーション」を搭載。**Windows フォーカス非奪取サイレントペーストモード**（編集中断なし・ダブルクリックで貼り付け）、**マウス中ボタン制御**、**修飾キーツータップ呼出**、**Win+V 乗っ取り** をサポート。 |
| 📊 **パノラマストレージマネージャー** | 12種類のデータ容量を可視化する専用ダッシュボード。ロングテールデータを見やすくする平方根マッピング。タイムライン絞り込み、**ローカル画像ファイルを連動削除** する一括クリーンアップ、SQLite 自動最適化（Auto VACUUM）。 |
| ☁️ **WebDAV クラウド資産バックアップ** | フルバックアップと軽量バックアップの分離。**定期時刻 / 間隔 / Cron 式** に対応した自動スケジューリングエンジン。サーバー認証情報は Windows 資格情報マネージャー（DPAPI）で安全に暗号化。 |
| 📱 **マルチデバイス同期 & 自動化** | 内蔵ローカル HTTP サーバー（`POST /api/write`）により、スマホの自動化ツール（Tasker / Shortcuts）から PC クリップボードへ直接書き込み可能。**ループ防止フィンガープリント** と5つの画像転送ポリシーを搭載。 |
| 🔒 **完全ローカル プライバシー保護** | 外部追跡や利用統計の送信は一切なし。単一の信頼できる情報源（Single Source of Truth）に基づく堅牢なデータベース設計で、ダウングレード時も含め高い下位互換性を確保。 |

---

## 🖼️ インターフェース プレビュー

<div align="center">
  <h4>クリップボード メインウィンドウ (サイドバーナビゲーション & 分類フィルター)</h4>
  <img src="./static/Clipboard.png" width="92%" alt="Clipboard" />
  <br/><br/>

  <h4>環境設定 - クリップボード & ウィンドウ動作</h4>
  <img src="./static/Settings - Clipboard.png" width="92%" alt="Settings Clipboard" />
  <br/><br/>

  <h4>ストレージ統計 - 多次元分析 & タイムライン</h4>
  <img src="./static/Settings - Storage Statistics.png" width="92%" alt="Storage Statistics" />
  <br/><br/>

  <h4>環境設定 - ショートカット記録 & 中ボタン制御</h4>
  <img src="./static/Settings - Shortcuts.png" width="92%" alt="Shortcuts" />
  <br/><br/>

  <h4>データバックアップ - WebDAV クラウドバックアップ & スケジュール</h4>
  <img src="./static/Settings - Data Backup.png" width="92%" alt="Data Backup" />
  <br/><br/>

  <h4>データ同期 - ローカル受信 & Webhook 配信</h4>
  <img src="./static/Settings - Data Sync.png" width="92%" alt="Data Sync" />
</div>

---

## 📥 ダウンロードとクイックスタート

### 🔗 当 Fork 拡張ブランチ
- 🚀 **最新リリースのダウンロード**：[GitHub Releases から Windows 最新パッケージを取得](https://github.com/3899/EcoPaste-Pro/releases/latest)
- 📖 **ドキュメント**：
  - [Windows インストールと設定ガイド](./docs/install.md)
  - [Android Tasker 同期設定ガイド](./docs/Android/README.md)

### 🔗 公式オリジナル版
- 🌐 GitHub トップページ：[EcoPasteHub/EcoPaste](https://github.com/EcoPasteHub/EcoPaste)
- 📥 公式ダウンロード：[EcoPaste Releases](https://github.com/EcoPasteHub/EcoPaste/releases)
- 📚 公式サイト：[EcoPaste 公式サイト](https://ecopaste.cn/)

---

## 🤝 コミュニティと問題の報告

1. 🔍 **よくある問題の確認**：まずは [インストールと設定ガイド](./docs/install.md) または既存の [Issues](https://github.com/3899/EcoPaste-Pro/issues) をご確認ください。
2. ❓ **Issue の送信**：不具合の報告や新機能の提案は、Windows バージョン（10/11）、再現手順、ログを添えて [新しい Issue](https://github.com/3899/EcoPaste-Pro/issues/new/choose) を投稿してください。

---

## 📄 ライセンスと謝辞

- 本プロジェクトは [GPL-3.0 ライセンス](./LICENSE) のもとで公開されています。
- 優れたベースを構築してくださった上流の [EcoPasteHub/EcoPaste](https://github.com/EcoPasteHub/EcoPaste) プロジェクトに深く感謝いたします。
- 「独立グループ表示」「二次編集」「コードハイライト」「ソースアプリ抽出」などの機能アイデアは [EcoPaste-Sync](https://github.com/Ruszero01/EcoPaste-Sync) から着想を得ました。心より御礼申し上げます。
