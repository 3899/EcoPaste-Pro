import { proxy } from "valtio";
import type { ClipboardStore } from "@/types/store";

export const clipboardStore = proxy<ClipboardStore>({
  audio: {
    copy: false,
  },

  content: {
    autoFavorite: false,
    autoPaste: "double",
    autoSort: false,
    codeDisplayLines: 6,
    copyPlain: false,
    defaultCollapse: false,
    deleteConfirm: true,
    displayLines: 4,
    enableCodeHighlighting: true,
    enableTextSelection: true,
    filesDisplayLines: 3,
    imageDisplayHeight: 100,
    operationButtons: [
      "previewImage",
      "openFolder",
      "openBrowser",
      "runCommand",
      "edit",
      "pastePlain",
      "copy",
      "star",
      "delete",
    ],
    pastePlain: false,
    recordSourceApp: true,
    showOriginalContent: false,
  },

  history: {
    duration: 0,
    maxCount: 0,
    unit: 1,
  },

  search: {
    autoClear: false,
    defaultFocus: false,
    position: "top",
  },
  webdav: {
    autoStrategy: "off",
    fullSchedule: {
      cronExpression: "",
      fixedHour: 0,
      fixedMinute: 0,
      fixedRepeat: "daily",
      intervalMinutes: 60,
      mode: "interval",
    },
    lastBackupAt: void 0,
    lastBackupError: void 0,
    lastBackupStatus: "none",
    liteSchedule: {
      cronExpression: "",
      fixedHour: 0,
      fixedMinute: 0,
      fixedRepeat: "daily",
      intervalMinutes: 15,
      mode: "interval",
    },
    manualLite: false,
    maxBackups: 0,
  },
  window: {
    backTop: false,
    position: "remember",
    showAll: false,
    style: "standard",
  },
});
