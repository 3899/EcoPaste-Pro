# 运行环境与数据存储

EcoPaste-Pro 面向 **Windows** 平台构建，坚持**隐私优先、完全掌控、离线可用**的架构设计原则。用户产生的所有剪贴板历史、图片资产、配置项与鉴权密钥均保存在 Windows 本地或用户自主指定的私有存储中。本文档系统化阐述其运行依赖、文件布局、持久化存储结构与数据库运维优化机制。

---

## 🖥️ 运行环境要求

| 指标 | 规范说明 |
| :--- | :--- |
| **支持系统** | Windows 10 (版本 1809 及以上) / Windows 11 |
| **硬件架构** | `x86_64` (64 位 AMD64 / Intel x64) |
| **核心图形引擎** | Microsoft Edge WebView2 Runtime |
| **系统渲染服务** | Windows 桌面窗口管理器 (DWM，支持透明亚克力/云母模糊窗口特效) |
| **执行权限** | 标准 Windows 普通用户权限（无需以管理员身份运行） |

---

## 📂 存储路径与文件目录结构

### 默认持久化根路径

在 Windows 系统的默认数据存储根目录：
- **默认路径**：`%APPDATA%\com.ayangweb.ecopaste\`（完整绝对路径通常形如 `C:\Users\<用户名>\AppData\Roaming\com.ayangweb.ecopaste\`）

### 核心文件与功能说明

| 文件 / 目录名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `data.db` | SQLite 数据库 | 剪贴板全量元数据、文本内容、分类标签、来源应用及收藏信息存储文件 |
| `data.db-wal` / `data.db-shm` | SQLite 运行时辅助 | WAL（Write-Ahead Logging）预写日志文件，大幅提升并发读写性能 |
| `config.json` | JSON 配置文件 | 用户偏好设置（快捷键、外观视图、清理策略、自动同步等配置） |
| `images/` | 媒体目录 | 剪贴板图片、截图及预览图的本地持久化转储目录（支持用户自定义重定向） |
| `icons/` | 图标缓存 | 从 Windows 复制源程序可执行文件中提取的原生应用图标缓存 |
| `staging/` | 临时目录 | WebDAV 备份与恢复时的校验隔离区，操作完成后自动清空 |

> [!TIP]
> **自定义媒体与数据库路径**：在「偏好设置 → 存储设置」中，您可以自由将图片存储路径与数据库存储路径重定向至任意磁盘分区（如 `D:\EcoPasteData\`），彻底避免 C 盘系统盘空间膨胀。

---

## 🗄️ SQLite 数据库架构设计

EcoPaste-Pro 采用强类型 SQL 查询构建器 [Kysely](https://kysely.dev/) 与 `TauriSqliteDialect` 驱动数据库交互，实行**单一事实来源（Single Source of Truth）**与**向下宽容兼容**的架构哲学。

### 1. 核心表结构 (`history`)

数据库所有的列定义统一维护在 `historyColumnDefs` 元模型中，建表与查询逻辑共用同一数据源：

```typescript
// 核心字段模型
interface HistoryTable {
  id: string;              // 唯一 UUID 主键
  type: string;            // 主类型 (text | image | files | html | rtf)
  subtype?: string;        // 细分语义类型 (link | email | color | code | svg | markdown | path | command 等)
  group?: string;          // 归属分组分类
  value: string;           // 存储正文或本地图片关联路径
  search?: string;         // 预处理检索倒排索引文本
  count: number;           // 相同内容复制频次计数
  width?: number;          // 图片原生宽度像素
  height?: number;         // 图片原生高度像素
  favorite: number;        // 是否收藏 (0: 未收藏, 1: 收藏)
  favoriteOrder?: string;  // 收藏夹独立拖拽排序权重
  note?: string;           // 用户自定义附加备注
  sourceAppName?: string;  // 复制来源软件名称 (如 VS Code, Chrome)
  sourceAppIcon?: string;  // 来源软件提取图标本地缓存路径
  createTime: string;      // 创建时间戳 (ISO 8601)
}
```

### 2. 数据库索引加速矩阵
针对历史大盘海量数据（数万条记录），系统内置了专用复合索引，彻底杜绝全表扫描：
- `idx_history_type`：按内容类型筛选加速。
- `idx_history_favorite`：收藏状态快速过滤。
- `idx_history_createTime`：时间倒序检索与范围查询加速。
- `idx_history_favoriteOrder`：收藏夹双轨拖拽排序极速加载。

---

## 🧹 数据库智能运维机制

为了保证应用在长期海量数据运行下的极速响应，内置了三维一体的自动化维护体系：

### 1. 轻量化大盘检索与内存防爆
在执行「全部清理」或「按类型批量删除」时，系统采用轻量化指针查询策略，查询层仅加载 `id` 与关联文件路径，**严格阻断文本、富文本与图片大体积字段进入前端内存**，彻底解决海量数据清理时的界面假死与内存暴涨。

### 2. 自动收缩 (Auto VACUUM) 与碎片整理
- 当单次批量删除、自动生命周期清理的条目数量 **≥ 50 条** 时，系统在后台自动执行：
  ```sql
  PRAGMA optimize;
  VACUUM;
  ```
- 及时收缩并释放被占用的磁盘空间碎片，使数据库文件物理体积与实际数据量保持动态一致。

### 3. 独占式维护锁 (Maintenance Lock)
通过单例 `maintenancePromise` 机制，将数据库优化、整理与文件磁盘清理等重型任务进行原子化串行排队，严格避免前台连续触发高频操作时发生 SQLite 死锁或表锁异常。

---

## 🔒 凭据安全与隐私隔离设计

### 1. Windows 系统原生凭据管理器存储
在 WebDAV 云端备份模块中，涉及 WebDAV 服务器地址、账户名及连接密码等高危敏感资产：
- **拒绝明文落盘**：`config.json` 中**绝不存储**任何用户密码明文。
- **硬件与系统级加密**：深度调用 Windows Credential Manager（Windows 凭据管理器，底层依托 Windows DPAPI 硬件级加密保护），应用层面不暴露明文，杜绝敏感凭据泄露。

### 2. 配置兼容与鲁棒性 (`strictDeepAssign`)
在多设备同步或低版本降级安装场景下，遵循「发送保守、接收宽容」的原则：
- 通过 `strictDeepAssign` 严格深度合并机制，本地仅解析接纳当前版本白名单中已声明的配置键。
- 未知配置字段将被安全隔离并静默丢弃，避免引发前端状态污染或运行时报错崩溃。

### 3. 纯本地隐私边界
- **零遥测**：软件内不集成任何第三方统计 SDK、分析探针或商业追踪代码。
- **离线运行**：除用户主动开启的「WebDAV 云备份」与「局域网数据同步」外，系统不会向公网服务器发起任何未授权网络请求。
