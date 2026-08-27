/**
 * Auto Backup Scheduler Engine
 *
 * Watches `clipboardStore.webdav.autoStrategy` and related schedule configs,
 * then schedules backups accordingly using setTimeout-based timers.
 */
import { subscribe } from "valtio";
import { clipboardStore } from "@/stores/clipboard";
import type { ScheduleConfig } from "@/types/store";
import { formatDate } from "@/utils/dayjs";
import {
  backupToWebdav,
  getDefaultWebdavBackupFileName,
} from "@/utils/webdavBackup";

// ─── Scheduler state ────────────────────────────────────────
let fullTimer: ReturnType<typeof setTimeout> | null = null;
let liteTimer: ReturnType<typeof setTimeout> | null = null;
let isRunning = false;

// ─── Helpers ────────────────────────────────────────────────

/** Compute delay (ms) for "fixed" schedule mode */
function computeFixedDelay(config: ScheduleConfig): number {
  const now = new Date();
  const { fixedRepeat, fixedHour, fixedMinute } = config;

  if (fixedRepeat === "hourly") {
    // next occurrence of :MM within the current or next hour
    const target = new Date(now);
    target.setMinutes(fixedMinute, 0, 0);
    if (target <= now) target.setHours(target.getHours() + 1);
    return target.getTime() - now.getTime();
  }

  // For daily and longer – compute next occurrence at HH:MM
  const target = new Date(now);
  target.setHours(fixedHour, fixedMinute, 0, 0);
  if (target <= now) {
    // advance to next period
    switch (fixedRepeat) {
      case "daily":
        target.setDate(target.getDate() + 1);
        break;
      case "weekly":
        target.setDate(target.getDate() + 7);
        break;
      case "biweekly":
        target.setDate(target.getDate() + 14);
        break;
      case "monthly":
        target.setMonth(target.getMonth() + 1);
        break;
      case "quarterly":
        target.setMonth(target.getMonth() + 3);
        break;
      case "semi_annual":
        target.setMonth(target.getMonth() + 6);
        break;
      case "yearly":
        target.setFullYear(target.getFullYear() + 1);
        break;
      default:
        target.setDate(target.getDate() + 1);
    }
  }
  return target.getTime() - now.getTime();
}

/** Compute delay (ms) for "interval" mode */
function computeIntervalDelay(config: ScheduleConfig): number {
  return (config.intervalMinutes || 60) * 60 * 1000;
}

/**
 * Simple cron-like parser supporting: minute hour day month weekday
 * Returns delay in ms until next matching time, or falls back to 60s.
 */
function computeCronDelay(config: ScheduleConfig): number {
  const expr = config.cronExpression?.trim();
  if (!expr) return 60 * 1000; // fallback 1 min

  try {
    const parts = expr.split(/\s+/);
    if (parts.length < 5) return 60 * 1000;

    const [minPart, hourPart] = parts;
    const now = new Date();

    // Simple implementation: parse minute and hour fields only
    const targetMinute = minPart === "*" ? -1 : parseInt(minPart, 10);
    const targetHour = hourPart === "*" ? -1 : parseInt(hourPart, 10);

    // Find next matching time within the next 48 hours
    const candidate = new Date(now);
    candidate.setSeconds(0, 0);
    candidate.setMinutes(candidate.getMinutes() + 1); // at least 1 min in future

    for (let i = 0; i < 2880; i++) {
      // 48 hours of minutes
      const h = candidate.getHours();
      const m = candidate.getMinutes();
      if (
        (targetHour === -1 || h === targetHour) &&
        (targetMinute === -1 || m === targetMinute)
      ) {
        return candidate.getTime() - now.getTime();
      }
      candidate.setMinutes(candidate.getMinutes() + 1);
    }
    return 60 * 60 * 1000; // fallback to 1 hour
  } catch {
    return 60 * 1000;
  }
}

/** Compute delay based on schedule config */
function computeDelay(config: ScheduleConfig): number {
  switch (config.mode) {
    case "fixed":
      return computeFixedDelay(config);
    case "interval":
      return computeIntervalDelay(config);
    case "cron":
      return computeCronDelay(config);
    default:
      return 60 * 60 * 1000;
  }
}

// ─── Core scheduling ────────────────────────────────────────

async function executeBackup(lite: boolean) {
  try {
    const fileName = await getDefaultWebdavBackupFileName(undefined, lite);
    await backupToWebdav(fileName, lite, clipboardStore.webdav.maxBackups);
    clipboardStore.webdav.lastBackupStatus = "success";
    clipboardStore.webdav.lastBackupAt = formatDate();
    clipboardStore.webdav.lastBackupMode = lite ? "lite" : "full";
    clipboardStore.webdav.lastBackupError = undefined;
  } catch (error: any) {
    clipboardStore.webdav.lastBackupStatus = "error";
    clipboardStore.webdav.lastBackupAt = formatDate();
    clipboardStore.webdav.lastBackupError = String(error);
    console.error("[AutoBackup] Failed:", error);
  }
}

function scheduleFullBackup() {
  if (fullTimer) {
    clearTimeout(fullTimer);
    fullTimer = null;
  }

  const strategy = clipboardStore.webdav.autoStrategy;
  if (strategy !== "full" && strategy !== "combined") return;

  const config = clipboardStore.webdav.fullSchedule;
  const delay = computeDelay(config);

  fullTimer = setTimeout(async () => {
    await executeBackup(false);
    // Re-schedule after completion
    scheduleFullBackup();
  }, delay);
}

function scheduleLiteBackup() {
  if (liteTimer) {
    clearTimeout(liteTimer);
    liteTimer = null;
  }

  const strategy = clipboardStore.webdav.autoStrategy;
  if (strategy !== "lite" && strategy !== "combined") return;

  const config = clipboardStore.webdav.liteSchedule;
  const delay = computeDelay(config);

  liteTimer = setTimeout(async () => {
    await executeBackup(true);
    // Re-schedule after completion
    scheduleLiteBackup();
  }, delay);
}

function stopAll() {
  if (fullTimer) {
    clearTimeout(fullTimer);
    fullTimer = null;
  }
  if (liteTimer) {
    clearTimeout(liteTimer);
    liteTimer = null;
  }
}

function applyStrategy() {
  stopAll();
  const strategy = clipboardStore.webdav.autoStrategy;

  switch (strategy) {
    case "off":
      // nothing to schedule
      break;
    case "full":
      scheduleFullBackup();
      break;
    case "lite":
      scheduleLiteBackup();
      break;
    case "combined":
      scheduleFullBackup();
      scheduleLiteBackup();
      break;
  }
}

// ─── Public API ─────────────────────────────────────────────

export function startAutoBackupScheduler() {
  if (isRunning) return;
  isRunning = true;

  // Apply current strategy immediately
  applyStrategy();

  // Watch for strategy or schedule config changes
  subscribe(clipboardStore.webdav, () => {
    applyStrategy();
  });
}

export function stopAutoBackupScheduler() {
  stopAll();
  isRunning = false;
}
