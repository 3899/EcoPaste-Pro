# 开发者指南

欢迎参与 EcoPaste-Pro 的开发与维护。本项目专为 **Windows** 桌面操作系统打造，基于 **Tauri v2** 底座，前端采用 **React 18 + TypeScript + Vite** 构建，后端采用 **Rust + Win32 API** 实现高性能系统级事件拦截、无缝按键接管、来源应用侦测与原生网络通信。

---

## 🛠️ 技术栈总览

| 维度 | 技术选型 | 作用与定位 |
| :--- | :--- | :--- |
| **桌面底座** | Tauri v2 (`@tauri-apps/api` v2) | 极低内存开销的 Windows 桌面应用外壳与 IPC 桥梁 |
| **系统后端** | Rust 2021 + Win32 API (`windows` crate) | Windows 低级键盘/鼠标钩子、Win+V 接管、进程图标提取、原生 HTTP 服务 |
| **UI 视图** | React 18 + TypeScript | 响应式前端交互与组件化渲染 |
| **组件库 & 样式** | Ant Design 5 + UnoCSS | 桌面级控件体系与原子化 CSS 样式系统 |
| **状态管理** | Valtio (`proxy`, `useSnapshot`) | 细粒度、零样板代码的响应式状态管理 |
| **数据库** | SQLite + Kysely + Tauri SQLite Dialect | 强类型 SQL 查询构建、事务控制与索引优化 |
| **代码高亮与编辑** | CodeMirror 6 + Shiki | 原生 IDE 级代码高亮、行号展示与沉浸编辑 |
| **代码规范与检查** | Biome + Commitlint | 极速代码格式化、静态检查与标准化提交规范 |

---

## 🌲 项目工程结构

```text
EcoPaste-Pro/
├── src-tauri/                         # Rust 后端工程
│   ├── Cargo.toml                     # Rust 依赖声明与 Win32 特性引用
│   ├── tauri.conf.json                # Tauri v2 主配置文件
│   ├── tauri.windows.conf.json        # Windows 平台定制构建配置
│   └── src/
│       ├── lib.rs                     # Tauri 插件装配与生命周期入口
│       ├── main.rs                    # 桌面应用二进制入口点
│       ├── core/                      # Windows 底层核心模块
│       │   ├── shortcut_hook.rs       # Win32 低级按键/鼠标钩子、Win+V接管
│       │   ├── source_app.rs          # 活动窗口侦测与应用图标提取
│       │   ├── prevent_default.rs     # 系统原生默认事件防护
│       │   └── setup/                 # 窗口托盘与启动初始化
│       └── plugins/                   # Rust 自定义业务插件
│           ├── autostart/             # 开机自启封装
│           ├── paste/                 # Win32 SendInput 模拟粘贴
│           ├── transfer/              # 本地 HTTP 接收服务与 Webhook 队列
│           ├── webdav/                # WebDAV 网络传输与目录嗅探
│           └── window/                # 不夺焦静默窗口与光标跟随
├── src/                               # React 前端工程
│   ├── components/                    # 通用业务 UI 组件库
│   ├── constants/                     # 全局常量、配置枚举
│   ├── database/                      # Kysely 数据库模型、迁移与查询逻辑
│   ├── hooks/                         # React 自定义 Hooks
│   ├── locales/                       # 多语言国际化词条 (zh-CN, en-US, zh-TW, ja-JP)
│   ├── pages/                         # 核心路由页面
│   │   ├── Main/                      # 剪贴板主窗口 (顶栏/侧边双视图)
│   │   └── Preference/                # 偏好设置中心 (外观、快捷键、同步、备份、统计等)
│   ├── plugins/                       # 前端对接 Tauri Rust 插件的封装层
│   ├── stores/                        # Valtio 响应式全局 Store
│   ├── types/                         # TypeScript 类型契约
│   └── utils/                         # 工具函数库
├── docs/                              # 项目系统化文档矩阵
├── scripts/                           # 构建与自动化脚本 (buildIcon, release)
├── package.json                       # 前端依赖与脚本配置
└── biome.json                         # Biome 代码规范配置
```

---

## 💻 本地开发环境准备

### 1. 前置依赖
- **操作系统**：Windows 10 (1809+) 或 Windows 11。
- **C++ 构建工具**：安装 [Visual Studio 生成工具](https://visualstudio.microsoft.com/visual-cpp-build-tools/)，勾选“使用 C++ 的桌面开发”。
- **Rust 工具链**：通过 `rustup` 安装最新 stable 版本的 `rustc` 与 `cargo`（目标架构 `x86_64-pc-windows-msvc`）。
- **Node.js 环境**：`Node.js v18.0.0+`（推荐 LTS 20 或 22）。
- **包管理器**：`pnpm`（必须使用 pnpm，配置了 `only-allow pnpm` 强约束）。

### 2. 依赖安装

```powershell
# 克隆仓库
git clone https://github.com/3899/EcoPaste-Pro.git
cd EcoPaste-Pro

# 安装前端依赖
pnpm install
```

### 3. 本地启动与调试

```powershell
# 模式一：仅启动前端 Vite 开发服务器（用于快速调整纯 UI 样式）
pnpm dev:vite

# 模式二：启动完整 Tauri 桌面端联动调试（推荐日常开发）
pnpm tauri dev
```

### 4. 生产产物构建

```powershell
# 生成图标并编译前端静态资源
pnpm build

# 构建 Windows 桌面端 Release 安装包与便携包
pnpm tauri build
```
编译产物将生成在 `src-tauri/target/release/bundle/nsis/` 与 `msi/` 目录下。

---

## 🧩 核心底层模块解析 (Windows 专精)

### 1. Win32 低级按键与鼠标钩子 (`src-tauri/src/core/shortcut_hook.rs`)
- **Win+V 无缝接管**：通过 Windows API `SetWindowsHookExW` 挂载低级键盘钩子（`WH_KEYBOARD_LL`），精准监听 `VK_LWIN` / `VK_RWIN` 与 `V` 键的击键时序。在命中接管时阻断 Windows 原生剪贴板弹出，并通过事件通道瞬间唤醒 EcoPaste 窗口；退出程序时调用 `UnhookWindowsHookEx` 安全释放。
- **鼠标中键控制**：挂载低级鼠标钩子（`WH_MOUSE_LL`），高精度捕获 `WM_MBUTTONDOWN` 与 `WM_MBUTTONUP` 消息，根据时间差区分中键单击与长按，且在剪贴板窗口内部操作时不拦截默认滚轮/中键事件。
- **双击修饰键判定**：在设定的时间窗口（默认 300ms）内记录 `Ctrl`、`Alt`、`Shift` 虚拟键的连续敲击状态，连击两次且无杂键输入时触发唤醒。

### 2. 来源应用识别 (`src-tauri/src/core/source_app.rs`)
- 剪贴板内容变更时，调用 Win32 原生 API：
  ```rust
  let hwnd = GetForegroundWindow();
  GetWindowThreadProcessId(hwnd, Some(&mut process_id));
  ```
- 配合 `QueryFullProcessImageNameW` 获取宿主 `.exe` 路径，并通过系统 API 提取可执行文件内置的原始 Icon 图标，转存为轻量 PNG 本地缓存，供前端在记录列表中直观显示来源软件。

### 3. 不夺焦静默窗口与光标跟随 (`src-tauri/src/plugins/window/`)
- **不夺焦模式**：呼出窗口时使用 `SWP_NOACTIVATE` 标志显示窗口，避免抢占当前外部编辑窗口的主焦点，使用户在保持当前应用输入状态的同时检视或双击粘贴。
- **光标跟随定位**：通过 Win32 输入法光标 API 获取光标在屏幕上的绝对像素坐标，将剪贴板呼出定位在光标右下方黄金交互视区内。

### 4. 本地轻量数据传输插件 (`src-tauri/src/plugins/transfer/`)
- 在本地监听指定端口，暴露 `POST /api/write` 接口，支持手机或外部局域网设备直接向 Windows 剪贴板写入内容。
- 维护异步 Webhook 推送队列，本地产生新记录时非阻塞派发至移动端。

---

## 🎨 代码质量与规范

### 代码检查与格式化
项目使用 **Biome** 作为代码检查与格式化工具：
```powershell
# 仅检查并修复 src/ 目录下的前端代码风格
pnpm lint
```

### Git 提交规范 (Commitlint)
提交说明遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：
```text
<type>(<scope>): <subject>

# 示例:
feat(shortcut): 新增鼠标中键长按唤醒防误触阈值设置
fix(edit): 修复侧边栏模式下历史条目编辑弹窗失效问题
docs(readme): 重构 README 结构并拆分独立子文档
```
常见 `type`：`feat`（新功能）、`fix`（Bug 修复）、`docs`（文档）、`style`（样式）、`refactor`（重构）、`perf`（性能）、`chore`（杂项）。
