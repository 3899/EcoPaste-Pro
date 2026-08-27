import { tempDir } from "@tauri-apps/api/path";
import { remove } from "@tauri-apps/plugin-fs";
import { decompress, fullName } from "tauri-plugin-fs-pro-api";
import {
  createSlimDatabase,
  deleteWebdavBackup,
  downloadWebdavBackup,
  listWebdavBackups,
  uploadWebdavBackup,
} from "@/plugins/webdav";
import { hotReloadData } from "@/utils/hotReload";
import {
  getBackupExtname,
  getSaveDatabasePath,
  getSaveDataPath,
  join,
} from "@/utils/path";
import { saveStore } from "@/utils/store";
import {
  cleanupPaths,
  compressStaging,
  copyStoreToStaging,
  createFullBackupArchive,
  createStagingDir,
} from "./backupArchive";
import type { BackupMode } from "./backupFilename";
import { buildBackupBasename } from "./backupFilename";
import { selectExcessWebdavBackups } from "./webdavRetention";

let retentionQueue = Promise.resolve();

/**
 * Normalize WebDAV backup file name (ensure correct extension)
 */
export const normalizeWebdavBackupFileName = (fileName: string) => {
  const ext = getBackupExtname();
  if (fileName.endsWith(`.${ext}`)) return fileName;
  if (fileName.toLowerCase().endsWith(".zip")) {
    return `${fileName.slice(0, -4)}.${ext}`;
  }
  return `${fileName}.${ext}`;
};

/**
 * Generate default WebDAV backup filename (without extension)
 */
export const getDefaultWebdavFilename = async (
  computerName?: string,
  lite = false,
) => {
  const mode: BackupMode = lite ? "lite" : "full";
  return buildBackupBasename(mode, computerName);
};

/**
 * Generate default WebDAV backup filename (with extension)
 */
export const getDefaultWebdavBackupFileName = async (
  computerName?: string,
  lite = false,
) => {
  const mode: BackupMode = lite ? "lite" : "full";
  const basename = await buildBackupBasename(mode, computerName);
  return normalizeWebdavBackupFileName(basename);
};

/**
 * List WebDAV backup files
 */
export const listWebdavBackupFiles = async () => {
  const list = await listWebdavBackups();
  const suffix = `.${getBackupExtname()}`.toLowerCase();
  return list.filter((item) => item.fileName.toLowerCase().endsWith(suffix));
};

export const trimWebdavBackupFiles = (
  maxBackups: number,
  currentFileName?: string,
) => {
  if (!Number.isFinite(maxBackups) || maxBackups <= 0) {
    return Promise.resolve();
  }

  const trim = async () => {
    const backups = await listWebdavBackupFiles();
    const excess = selectExcessWebdavBackups(
      backups,
      maxBackups,
      currentFileName,
    );
    for (const backup of excess) {
      await deleteWebdavBackup(backup.fileName);
    }
  };

  const result = retentionQueue.then(trim, trim);
  retentionQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
};

/**
 * Create WebDAV backup archive
 */
export const createWebdavBackupArchive = async (
  fileName: string,
  lite: boolean,
) => {
  const tempRoot = await tempDir();
  const archivePath = join(tempRoot, fileName);

  if (lite) {
    await saveStore(true);
    const stagingDir = await createStagingDir("lite-staging");
    const cleanupList = [stagingDir];

    const storeBasename = await copyStoreToStaging(stagingDir);

    const sourceDbPath = await getSaveDatabasePath();
    const dbBasename = await fullName(sourceDbPath);
    const stagingDbPath = join(stagingDir, dbBasename);
    await createSlimDatabase(sourceDbPath, stagingDbPath);

    await compressStaging(stagingDir, archivePath, [storeBasename, dbBasename]);

    return { archivePath, cleanupPaths: cleanupList };
  }

  const result = await createFullBackupArchive(archivePath);
  return { archivePath: result.archivePath, cleanupPaths: result.cleanupList };
};

/**
 * Cleanup backup temp files
 */
export { cleanupPaths as cleanupBackupFiles };

/**
 * Backup to WebDAV
 */
export const backupToWebdav = async (
  fileName: string,
  lite: boolean,
  maxBackups = 0,
) => {
  const resolvedName = normalizeWebdavBackupFileName(fileName);
  const { archivePath, cleanupPaths: cleanups } =
    await createWebdavBackupArchive(resolvedName, lite);
  try {
    await uploadWebdavBackup(archivePath, resolvedName);
    await trimWebdavBackupFiles(maxBackups, resolvedName);
  } finally {
    await cleanupPaths([archivePath, ...cleanups]);
  }
};

/**
 * Restore from WebDAV backup
 */
export const restoreWebdavBackup = async (fileName: string) => {
  const path = await downloadWebdavBackup(fileName);
  await hotReloadData(async () => {
    await decompress(path, getSaveDataPath());
    await remove(path);
  });
};
