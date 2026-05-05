import type { Platform } from "@tauri-apps/plugin-os";

export type Theme = "auto" | "light" | "dark";

export type Language = (typeof LANGUAGE)[keyof typeof LANGUAGE];

export interface Store {
  globalStore: GlobalStore;
  clipboardStore: ClipboardStore;
  transferStore: TransferStore;
}

export interface GlobalStore {
  // 应用设置
  app: {
    autoStart: boolean;
    silentStart: boolean;
    showMenubarIcon: boolean;
    showTaskbarIcon: boolean;
  };

  // 外观设置
  appearance: {
    theme: Theme;
    isDark: boolean;
    language?: Language;
  };

  update: {
    auto: boolean;
    beta: boolean;
  };

  // 快捷键设置
  shortcut: {
    clipboard: string;
    preference?: string;
    quickPaste: {
      enable: boolean;
      value: string;
    };
    pastePlain: string;
  };

  // 只在当前系统环境使用
  env: {
    platform?: Platform;
    appName?: string;
    appVersion?: string;
    saveDataDir?: string;
  };
}

export type ClickFeedback = "none" | "copy" | "paste";

export type OperationButton =
  | "copy"
  | "pastePlain"
  | "note"
  | "star"
  | "delete"
  | "openBrowser"
  | "previewImage"
  | "edit"
  | "openFolder"
  | "runCommand"
  | "push";

export interface ClipboardStore {
  // 窗口设置
  window: {
    style: "standard" | "dock";
    position: "remember" | "follow" | "center";
    backTop: boolean;
    showAll: boolean;
  };

  // 音效设置
  audio: {
    copy: boolean;
  };

  // 搜索框设置
  search: {
    position: "top" | "bottom";
    defaultFocus: boolean;
    autoClear: boolean;
  };

  // 剪贴板内容设置
  content: {
    recordSourceApp: boolean;
    enableCodeHighlighting: boolean;
    autoPaste: "single" | "double";
    copyPlain: boolean;
    pastePlain: boolean;
    operationButtons: OperationButton[];
    autoFavorite: boolean;
    enableTextSelection: boolean;
    deleteConfirm: boolean;
    deleteSkipConfirmWithShift: boolean;
    autoSort: boolean;
    showOriginalContent: boolean;
    displayLines: number; // 显示行数，默认 4
    codeDisplayLines: number; // 代码显示行数，默认 6
    filesDisplayLines: number; // 文件/文件夹显示行数，默认 3
    imageDisplayHeight: number; // 图片显示高度（像素），默认 100
    defaultCollapse: boolean; // 默认收起，默认 false
  };

  // 历史记录
  history: {
    duration: number;
    unit: number;
    maxCount: number;
  };

  // WebDAV 备份调度配置
  webdav: {
    autoStrategy: AutoBackupStrategy;
    fullSchedule: ScheduleConfig;
    liteSchedule: ScheduleConfig;
    manualLite: boolean;
    maxBackups: number;
    lastBackupAt?: string;
    lastBackupMode?: "full" | "lite";
    lastBackupStatus?: "none" | "success" | "error";
    lastBackupError?: string;
  };
}

// 备份周期调度模式
export type ScheduleMode = "fixed" | "interval" | "cron";

// 备份周期配置
export interface ScheduleConfig {
  mode: ScheduleMode;
  // 定时模式
  fixedHour: number;
  fixedMinute: number;
  fixedRepeat:
    | "hourly"
    | "daily"
    | "weekly"
    | "biweekly"
    | "monthly"
    | "quarterly"
    | "semi_annual"
    | "yearly";
  // 间隔模式 (分钟)
  intervalMinutes: number;
  // cron 模式
  cronExpression: string;
}

// 自动备份策略
export type AutoBackupStrategy = "off" | "full" | "lite" | "combined";

// 自动推送模式
export type AutoPushMode = "off" | "favorites_only" | "custom";

// 数据互传配置
export interface TransferStore {
  push: {
    masterEnabled: boolean;
    autoPushMode: AutoPushMode;
    autoPushTags: string[]; // CONTENT_TYPE_TAGS keys
    provider?: "bark" | "webhook"; // legacy fallback for older persisted config
    barkEnabled: boolean;
    webhookEnabled: boolean;
    // Bark 非敏感配置
    barkAutoCopy: boolean;
    barkArchive: boolean;
    barkLevel: "active" | "timeSensitive" | "passive";
    barkGroupMode: "disabled" | "auto" | "custom";
    barkGroupMapping: Record<string, string>;
    imageStrategy:
      | "lan_server"
      | "webhook_server"
      | "webdav"
      | "localpath"
      | "reject";
    imageTtlSeconds: number;
    imageLocalDirectory: string;
    // Webhook 非敏感配置
    webhookPayloadTemplate: string;
  };
  receive: {
    masterEnabled: boolean;
    port: number;
    autoCopy: boolean; // 自动写入系统剪贴板
  };
}
