<a href="https://github.com/EcoPasteHub/EcoPaste">
  <img src="https://socialify.git.ci/EcoPasteHub/EcoPaste/image?description=1&descriptionEditable=Open%20source%20clipboard%20management%20tools%20for%20Windows%2C%20MacOS%20and%20Linux(x11).&font=Source%20Code%20Pro&forks=1&issues=1&logo=https%3A%2F%2Fgithub.com%2FEcoPasteHub%2FEcoPaste%2Fblob%2Fmaster%2Fpublic%2Flogo.png%3Fraw%3Dtrue&name=1&owner=1&pattern=Floating%20Cogs&pulls=1&stargazers=1&theme=Auto" alt="EcoPaste" />
</a>

<div align="center">
  <br/>
  
  <div>
      English | <a href="./README.md">简体中文</a> | <a href="./README.zh-TW.md">繁體中文</a> | <a href="./README.ja-JP.md">日本語</a>
  </div>

  <br/>
    
  <div>
    <a href="https://github.com/EcoPasteHub/EcoPaste/releases">
      <img
        alt="Windows"
        src="https://img.shields.io/badge/-Windows-blue?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB0PSIxNzI2MzA1OTcxMDA2IiBjbGFzcz0iaWNvbiIgdmlld0JveD0iMCAwIDEwMjQgMTAyNCIgdmVyc2lvbj0iMS4xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHAtaWQ9IjE1NDgiIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4Ij48cGF0aCBkPSJNNTI3LjI3NTU1MTYxIDk2Ljk3MTAzMDEzdjM3My45OTIxMDY2N2g0OTQuNTEzNjE5NzVWMTUuMDI2NzU3NTN6TTUyNy4yNzU1NTE2MSA5MjguMzIzNTA4MTVsNDk0LjUxMzYxOTc1IDgwLjUyMDI4MDQ5di00NTUuNjc3NDcxNjFoLTQ5NC41MTM2MTk3NXpNNC42NzA0NTEzNiA0NzAuODMzNjgyOTdINDIyLjY3Njg1OTI1VjExMC41NjM2ODE5N2wtNDE4LjAwNjQwNzg5IDY5LjI1Nzc5NzUzek00LjY3MDQ1MTM2IDg0Ni43Njc1OTcwM0w0MjIuNjc2ODU5MjUgOTE0Ljg2MDMxMDEzVjU1My4xNjYzMTcwM0g0LjY3MDQ1MTM2eiIgcC1pZD0iMTU0OSIgZmlsbD0iI2ZmZmZmZiI+PC9wYXRoPjwvc3ZnPg=="
      />
    </a >  
    <a href="https://github.com/EcoPasteHub/EcoPaste/releases">
      <img
        alt="MacOS"
        src="https://img.shields.io/badge/-MacOS-black?style=flat-square&logo=apple&logoColor=white"
      />
    </a >
    <a href="https://github.com/EcoPasteHub/EcoPaste/releases">
      <img 
        alt="Linux"
        src="https://img.shields.io/badge/-Linux-yellow?style=flat-square&logo=linux&logoColor=white" 
      />
    </a>
  </div>

  <div>
    <a href="./LICENSE">
      <img
        src="https://img.shields.io/github/license/EcoPasteHub/EcoPaste?style=flat-square"
      />
    </a >
    <a href="https://github.com/EcoPasteHub/EcoPaste/releases">
      <img
        src="https://img.shields.io/github/package-json/v/EcoPasteHub/EcoPaste?style=flat-square"
      />
    </a >
    <a href="https://github.com/EcoPasteHub/EcoPaste/releases">
      <img
        src="https://img.shields.io/github/downloads/EcoPasteHub/EcoPaste/total?style=flat-square"
      />  
    </a >
  </div>
  
  <br/>

  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./static/app-dark.en-US.png" />
    <source media="(prefers-color-scheme: light)" srcset="./static/app-light.en-US.png" />
    <img src="./static/app-light.en-US.png" />
 </picture>
</div>

## Download

### Windows

Latest Version: [Download Latest Build from Releases](https://github.com/3899/EcoPaste/releases/latest)

Installation Guide: [Click here](https://ecopaste.cn/guide/install#linux)

## Features

- 🎉 Built with Tauri v2, lightweight and efficient, taking cross-platform experience to the next level.
- 💻 Compatible with Windows, macOS, and Linux (X11), enabling seamless switching between devices.
- ✨ Simple and intuitive user interface, easy to operate, zero learning curve, ready to use out of the box.
- 📋 Supports clipboard content types like plain text, rich text, HTML, images, and files.
- 🔒 Local data storage ensures user privacy and gives users full control over their data.
- 📝 Notes feature allows easy categorization, management, and retrieval to boost productivity.
- ⚙️ Rich personalization settings to meet diverse user needs and create a tailored experience.
- 🤝 Comprehensive documentation and community support to explore and grow with developers.
- 🧩 Continuously optimized with more exciting features waiting to be discovered.

## 🚀 Fork Update History

> This repository is a fork of [EcoPasteHub/EcoPaste](https://github.com/EcoPasteHub/EcoPaste) with the following usability improvements and update history:

### M05.x <font size="-2" color="gray">(Based on original v0.6.0-beta.3 branch)</font>

#### M05.1

##### ✨ New Features (A New Space Manager Experience)
- **📊 Panoramic Chart View**
  - **📋 Multi-Dimensional Storage Stats Panel**: Added 12 core content types storage stats, visually displaying space usage; supports independent "All/Favorites" switching, allowing separate inspection of storage data for favorite records.
  - **⚡ Ultra-High-Performance Stats Engine**: Refactored the physical volume tracing and dashboard stats logic. Replaced blocking Disk IO traversal with unified memory-level database queries, allowing instant loading even with tens of thousands of records and hundreds of GBs of data.
  - **📈 Dynamic Visual Balancing Algorithm**: To handle significantly varying "long-tail data," adopted a square-root smoothing formula that ensures intuitive contrast while preventing small files from becoming "invisible."
  - **🎯 Panoramic Data Pass-Through Interaction**: Optimized the bar chart interaction area. Hovering now reveals a floating card in real-time displaying the corresponding correct item count and accurate volume.
- **⏳ Flexible Timeline Navigation**
  - **⏰ Global Intelligent Time Filtering**: Built-in time filter with support for `Today`, `Yesterday`, `Last 3 Days`, `This Week`, `This Month`, and `Custom` date ranges, instantly rendering storage data for the specified period.
  - **🔗 Fully Merged Module Response**: Time filtering perfectly synchronizes with statistical charts and detail lists. Switching times updates the visualization of data accumulations and trends instantly.
- **🧹 Intelligent Anti-Mistake Cleanup**
  - **🗑️ Typological Accurate Cleanup**: Supports multi-selection by content type for 1-click batch cleanup of `Unfavorited` / `Favorited` redundant history data.
  - **🖼️ Image Deep Correlated Cleanup**: When cleaning up images, alongside obliterating database fingerprints, the system now simultaneously supports "synchronous deletion of local image files," genuinely freeing disk space and perfectly complementing custom storage paths.

##### 🐞 Bug Fixes
- **🌐 Web Link Identification Fix**: Optimized clipboard type judgment logic. URL/email addresses copied in plain text format will be forcibly recognized as plain text, resolving the issue where styled links copied from web pages were misidentified as HTML.
- **🎨 Color Code Misclassification Fix**: Refactored color recognition validation engine to only validate standard color values, preventing ordinary English words (e.g., `Tan`, `azure`, etc.) from being falsely recognized and highlighted.

##### 🐛 Upstream Bug Fixes
- **📂 File Icon Path Isolation Fix**: Deeply integrated the `tauri-plugin-fs-pro` underlying API. File icons will now precisely save into the user's custom directory and no longer leave redundant files in the system's default `AppData` path.

#### M05.0

#### ✨ New Features
- **📅 Multi-Dimensional Filtering**: Added combined "Date + Content Type" multi-dimensional filtering. Click the funnel icon at the top to open the filter panel. Supports three independent date filter modes — by day, by month, and custom date range — along with multi-select for 12 content type tags, enabling efficient and precise content inspection.
- **🧩 Code (SVG) Smart Detection**: Added intelligent SVG formatted content recognition at the code level, leveraging "regex pre-screening of component skeleton + DOMParser XML structure parsing" dual validation for security, with SVG results categorized under the explicit `Code (SVG)` label.
- **📌 Detail-Level Global Tooltip**: Hovering over any text area in a content item's header reveals comprehensive core attributes including source app, content type, character count (file size / resolution), creation time, and more for convenient detail inspection.

#### 💫 UX Optimization
- **📝 Adaptive Precise Time Display**: Refactored clipboard history time display logic. When relative time (e.g., "3 days ago") exceeds 3 days, it automatically switches to the `YY/M/D H:mm` absolute time format for clearer and more informative time tracing.
- **🧹 Top Controls Layout Reorganization**: Optimized the top layout of the search floating window by narrowing the search input width and front-loading the "Pin/Unpin" and "Preferences" action button groups for significantly improved access to high-frequency operations.
- **🏗️ Focus Management Full Rollback**: The "No-Focus Silent Window" and "Window Follows Caret Position" features have been fully reverted to the original v0.6.0-beta.3 implementation, removing the background polling threads and additional mount interfaces that relied heavily on the Win32 API, and restoring the main window's native focus capture mechanism.

#### 🐞 Bug Fixes
- **🚀 Group Switch on Activation Failure**: Completely resolved the issue where the "Preferences → Clipboard → Switch to All Groups on Window Activation" setting failed to take effect, ensuring the app strictly follows user-defined group rules upon activation.
- **📰 Composite Code Misclassification**: Completely fixed a priority override vulnerability where copying mixed "plain text code + HTML rich text semantics" fragments from IDEs or web pages caused content to be forcibly classified as `HTML` hypertext type, ensuring accurate recognition and classification of copied code.
- **🌐 HTML Code Misclassification**: Refactored the underlying HTML detection logic with regex compatibility for declaration headers and case-insensitive scenarios, completely resolving misclassification caused by skeleton validation failures and significantly improving detection accuracy.
- **📝 Markdown Misclassification**: Completely refactored the Markdown detection logic, upgrading to a composite intelligent engine with "core syntax positive weighting + illegal feature negative penalty + strict prefix boundary validation", effectively resolving issues where JS and other code snippets were misidentified as Markdown.
- **📋 JavaScript Code Misclassification**: Refactored the underlying code language detection engine, elevating JavaScript detection to the highest priority with targeted strong feature keywords for frontend build artifacts. Removed generic operators (`<<`, `>>`) from C++ detection rules that conflicted with JS shift operations, and added a JS feature "reverse kill" validation mechanism, completely resolving the persistent issue of obfuscated/minified frontend JS production code being misidentified as "Code (C++)".
- **🗑️ Legacy Garbage Cleanup**: Performed deep comparison and thorough cleanup of residual temporary files from deprecated mounts, eliminating redundant data interference with future feature refactoring from the root.

#### 🐛 Upstream Bug Fixes
- **👁️ Full-Width Item Header Release**: Removed the original UI behavior of forcibly reserving fixed width for invisible action buttons on the right side. In unselected state, the record header attribute bar now achieves 100% full-width display, providing more content space and more complete information presentation.

### M04.x <font size="-2" color="gray">(Based on original v0.6.0-beta.3 branch)</font>

#### M04.6

##### 🐞 Bug Fixes
- **🔀 Group Switching Content Display Anomaly**: Fixed a race condition where rapidly switching groups in the clipboard window displayed incorrect content, caused by subsequent group click requests being discarded while the component was in a loading state.

#### M04.5

##### 🏗️ Architecture Optimization
- **🛡️ Downward Compatibility Hardening**: Implemented the robustness principle of "conservative in what you send, liberal in what you accept", resolving crash issues during version downgrades caused by data structure incompatibilities.
- **🗄️ Database Query Safeguard**: Refactored the database query layer utilizing a "Unified Column Definition → On-Demand Query" architecture, driven solely by the `historyColumnDefs` data source for both table creation and querying. Lower versions will automatically ignore unknown columns added by higher versions, completely eliminating downgrade crashes caused by structural differences.
- **⚙️ Config Processing Safeguard**: Added the `strictDeepAssign` strict deep-merge mechanism. Config sync now only accepts options defined in the current version. Unknown config fields written by higher versions will be silently discarded, preventing rendering anomalies caused by state pollution.

##### 💫 UX Optimization
- **🎨 Text Selection Highlight Tuning**: Changed the selected text highlight background color in the clipboard to a softer blue `#4096FF`, and set the text color to white `#FFFFFF`.
- **📍 "Back to Top" Button Position Tuning**: Standardized the position of the "Back to Top" button in the bottom right corner of the clipboard window, keeping its bottom and right margins equal.

##### 🐞 Bug Fixes
- **📋 Source App Tracking Fix**: Fixed an issue where, with `autoSort` enabled, the source icon/name of the latest clipboard item incorrectly reflected the currently active window rather than the original copying app. The app info from the original copy event is now preserved.
- **💥 Downgrade Crash Fix**: Fixed a rendering crash (`Cannot destructure property 'key'`) that occurred when downgrading from a higher version to a lower version due to extra database fields in the clipboard window (effective for current and future versions).

#### M04.4

##### ✨ New Features
- **✂️ Support for Text Snippet Selection**: You can select specific text snippets within the clipboard window and quickly perform "Copy / Paste" operations using the auto-popping floating toolbar or enhanced context menu. Supports `Plain Text`, `Rich Text`, and `HTML` types.
- **🔛 Text Snippet Selection Toggle**: You can independently enable or disable partial text selection as needed (Preferences → Content Settings → Text Snippet Selection).

#### M04.3

##### ✨ New Features
- **🎨 CMYK Color Detection**: Added smart extraction and preview support for CMYK color formats.

##### 💫 UX Optimization
- **🖱️ Context Menu Refactoring**:
  - **Feature Grouping**: Categorized actions into "Copy/Paste", "Operations", and "Editing". Related functions are grouped together and operation paths shortened to improve selection efficiency.
  - **Logical Ordering**: Arranged menu items based on operational flow and usage frequency.
  - **Type-Specific Menus**: Tailor-made exclusive menu items for 12 content types (`Plain Text`, `Rich Text`, `HTML`, `Image`, `File`, `Markdown`, `Link`, `Path`, `Code`, `Email`, `Color`, `Command`).

##### 🐞 Bug Fixes
- **⚙️ Action Button Configuration**: Added the missing "Run" command in Preferences, allowing users to configure its visibility and order properly.
- **🎨 Color Group Sync Fix**: Fixed the dynamic sync issue where new colors failed to auto-update at the top when viewing the "Color" group.

#### M04.2

##### ✨ New Features
- **🔍 Windows Path & Command Smart Recognition**: Automatically detects environment variable paths (`%APPDATA%`, etc.), Shell folders (`shell:startup`, etc.), filesystem paths (`C:\Windows`, etc.) and system management commands (`regedit`, etc.), with one-click open or run via context menu and action buttons.
- **🔄 Config Auto-Sync**: Preference changes are automatically synced to the user's custom data directory, ensuring backup configuration is always up-to-date.

#### M04.1

##### ✨ New Features
- **☁️ WebDAV Cloud Backup Enhancement**:
  - **Decoupled Slim/Full Backups**: Segmented backup policies into "Full" and "Slim" routines. Allows independent scheduling and management for manual or automatic backups.
  - **Automated Scheduling Engine**: Built-in frontend task scheduler supporting flexible combinations of "Time", "Interval", and "Cron Expressions", enabling dual-pipeline scheduling for both full and slim backups.
- **📝 Markdown Support**: Adopted a new score-weighted regex detection strategy to accurately identify Markdown structures, preventing misclassification of code or standard text, complete with independent rich Markdown editors.
- **🖼️ Image Directory Locating**: Allows image types to open the system file explorer directly navigating precisely to the source file directory.

##### 💫 UX Optimization
- **☁️ Seamless Restore Interaction**: Refactored WebDAV restore logic to eagerly render UI skeletons and loaders while asynchronously fetching backup arrays, eliminating UI freezing and lack of feedback.
- **💾 Backup Archive Compatibility**: Implemented a Staging Directory mapping technique ensuring WebDAV `.zip` structure is identical to native Export Data structure, achieving two-way compatibility.

##### 🐞 Bug Fixes
- **🌐 WebDAV Cross-Platform Directories**: Ensured automated creation of remote WebDAV folder trees via Rust hooks (`ensure_remote_dir`) fixing `405 Method Not Allowed` exceptions.
- **💾 Database Backup Abortion Fixes**: Defensively patched `Invalid column type Null` errors thrown by underlying Kysely when blank records exist in the Clipboard History table.
- **📋 Classification Weight Optimization**: Completely fixed an issue where copying cells in Excel resulted in forced downgrade of text content into images due to conflicting Image+HTML types holding the clipboard simultaneously.

### M03.x <font size="-2" color="gray">(Based on original v0.6.0-beta.3 branch)</font>

#### ✨ New Features
- **☁️ WebDAV Cloud Backup**: Back up clipboard data to cloud storage via WebDAV protocol (Nutstore, NextCloud, etc.). Supports manual backup, automatic scheduled backups, backup count limits, and one-click restore.
- **🔒 Native Credential Security**: Sensitive WebDAV configurations including server URLs, usernames, passwords, and paths are securely persisted via native Windows Credential Manager, fully encrypting data to prevent plaintext leakage and ensure privacy.
- **🗑️ Optional Local Image Deletion**: When deleting images, a "Delete local file" option (checked by default) is shown in the confirmation dialog, allowing you to keep the local file while removing only the clipboard record.

### M02.x <font size="-2" color="gray">(Based on original v0.6.0-beta.3 branch)</font>

#### ✨ New Features
- **🎨 Dedicated Groups & Color Preview**: Added native "Links", "Colors", "Code", and "Email" group categories. Accurately extracts and highlights RGB/RGBA color formats; path links are highlighted for quick access.
- **📝 Rich Secondary Editing**: Supports independent pop-up editing for text and other rich content, with system-level quick file location.
- **💻 Code Syntax Highlighting**: Automatically detects copied code snippets and renders IDE-quality syntax highlighting (Preferences → Clipboard → Display Settings → Code Syntax Highlight).
- **🎯 Source App Tracking**: Shows the source app's icon and name when copying (Preferences → Clipboard → Display Settings → Record App Source).
- **⚡️ Native Quick Access**: Support opening file paths directly in the system file explorer, opening web links in the browser with one click, and viewing images using the system's default image viewer.
- **🔢 Custom Code/File Display Lines**: Extended line number customizations to support Code and File datatypes. (Preferences → Clipboard → Display Settings → Code/File display lines).

> **Acknowledgments**: The implementation ideas for "Dedicated Groups & Color Preview", "Rich Secondary Editing", "Code Syntax Highlighting", "🎯 Source App Tracking", and "Native Quick Access" in this project refer to [EcoPaste-Sync](https://github.com/Ruszero01/EcoPaste-Sync). We hereby express our gratitude.

#### 🐛 Upstream Bug Fixes
- **📸 Perfect Screenshot Dump**: Rebuilt SQLite persistence and the underlying FS mapping path to save screenshots perfectly to custom local directories, entirely fixing the issue where built-in library limits caused custom directory crashes and broken image displays, while avoiding C: drive bloat.
- **🔗 Duplicate Link Records**: Completely fixed the stubborn issue where copying a link produces two identical records in the clipboard.
- **📊 Double Record of Copied Document Table Content**: Completely fixed the issue where copying content from tables in documents like Word or Excel resulted in two completely identical records appearing simultaneously in the clipboard.

### M01.x <font size="-2" color="gray">(Based on original v0.6.0-beta.3 branch)</font>

#### 🔄 Dynamic Expand/Collapse & Immersive Experience
- **Full Content Expansion**: Provides expand/collapse buttons when content exceeds display limits; states persist across virtual scrolling.
- **No-Focus Silent Window (Windows)**: The host app retains focus when the clipboard window appears; double-click to paste silently; auto-hides when clicking outside.
- **Follow Input Cursor**: Window follows the editor's text cursor position for seamless workflow.
- **Redesigned Preferences**: Added "Display Settings" section with granular control over advanced options.

#### 📏 Advanced Text & Image Display
- **Custom Text Display Lines**: Preferences → Clipboard → Display Settings → Text display lines (1-50 lines)
- **Image Height Scaling**: Flexibly adjust image display height with smart expand/collapse (50-500 pixels)

#### ⚙️ Config Persistence
- All new settings are automatically saved to the user data directory and persist across app updates.

#### 🐛 Upstream Bug Fixes
- **📋 Clipboard Type Misidentification**: Completely fixed the issue where web images might be incorrectly identified as HTML due to html weight priority. Rewrote detection logic to give image types the highest priority.
- **💾 Backup Tunnel Restored**: Re-enabled the data backup/restore entry that was hidden due to permission restrictions in the original version, ensuring stable imports and exports.

#### 🔄 Auto Sync with Upstream
- Automatically checks for updates from upstream EcoPasteHub/EcoPaste daily
- Auto-merges and triggers builds when new versions are available
- Creates an issue for manual resolution if merge conflicts occur

---

## Feedback

1. 🔍 First, check out the [FAQ](https://ecopaste.cn/problem/macos/damage) or browse through the existing [issues](https://github.com/EcoPasteHub/EcoPaste/issues).

2. ❓ If your issue remains unresolved, please submit a new [issue](https://github.com/EcoPasteHub/EcoPaste/issues/new/choose) with a detailed description to help us quickly identify and address the problem.
