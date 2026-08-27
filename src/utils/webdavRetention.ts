export interface WebdavBackupMetadata {
  fileName: string;
  modified?: string;
}

const BACKUP_TIMESTAMP_PATTERN = /(?:^|\.)(\d{14})(?:\.|$)/;

export const parseWebdavBackupTimestamp = (fileName: string) => {
  const match = fileName.match(BACKUP_TIMESTAMP_PATTERN);
  if (!match) return;

  const timestamp = match[1];
  const parts = [
    timestamp.slice(0, 4),
    timestamp.slice(4, 6),
    timestamp.slice(6, 8),
    timestamp.slice(8, 10),
    timestamp.slice(10, 12),
    timestamp.slice(12, 14),
  ].map(Number);
  const [year, month, day, hour, minute, second] = parts;
  const date = new Date(year, month - 1, day, hour, minute, second);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return;
  }

  return date.getTime();
};

const getBackupTime = (
  backup: WebdavBackupMetadata,
  currentFileName?: string,
) => {
  if (backup.fileName === currentFileName) return Number.POSITIVE_INFINITY;

  const fileNameTime = parseWebdavBackupTimestamp(backup.fileName);
  if (fileNameTime !== undefined) return fileNameTime;

  const modifiedTime = backup.modified
    ? Date.parse(backup.modified)
    : Number.NaN;
  return Number.isNaN(modifiedTime) ? 0 : modifiedTime;
};

export const selectExcessWebdavBackups = <T extends WebdavBackupMetadata>(
  backups: T[],
  maxBackups: number,
  currentFileName?: string,
) => {
  if (!Number.isFinite(maxBackups) || maxBackups <= 0) return [];

  const limit = Math.floor(maxBackups);
  return backups
    .map((backup) => ({
      backup,
      time: getBackupTime(backup, currentFileName),
    }))
    .sort(
      (a, b) =>
        b.time - a.time || b.backup.fileName.localeCompare(a.backup.fileName),
    )
    .slice(limit)
    .map(({ backup }) => backup);
};
