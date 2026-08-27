import assert from "node:assert/strict";
import test from "node:test";
import {
  parseWebdavBackupTimestamp,
  selectExcessWebdavBackups,
} from "./webdavRetention";

test("selects backups older than the configured maximum", () => {
  const backups = [
    { fileName: "EcoPaste.20260801000000.pc.Windows.full.EcoPaste-backup" },
    { fileName: "EcoPaste.20260803000000.pc.Windows.full.EcoPaste-backup" },
    { fileName: "EcoPaste.20260802000000.pc.Windows.full.EcoPaste-backup" },
  ];

  assert.deepEqual(
    selectExcessWebdavBackups(backups, 2).map(({ fileName }) => fileName),
    ["EcoPaste.20260801000000.pc.Windows.full.EcoPaste-backup"],
  );
});

test("falls back to the WebDAV modified time for custom file names", () => {
  const backups = [
    {
      fileName: "old.EcoPaste-backup",
      modified: "Wed, 01 Jul 2026 00:00:00 GMT",
    },
    {
      fileName: "new.EcoPaste-backup",
      modified: "Sat, 01 Aug 2026 00:00:00 GMT",
    },
  ];

  assert.deepEqual(selectExcessWebdavBackups(backups, 1), [backups[0]]);
});

test("always retains the backup that just finished uploading", () => {
  const current = { fileName: "manual-name.EcoPaste-backup" };
  const timestamped = {
    fileName: "EcoPaste.20260803000000.pc.Windows.full.EcoPaste-backup",
  };

  assert.deepEqual(
    selectExcessWebdavBackups([timestamped, current], 1, current.fileName),
    [timestamped],
  );
});

test("disables cleanup for zero and rejects invalid timestamps", () => {
  assert.deepEqual(selectExcessWebdavBackups([{ fileName: "backup" }], 0), []);
  assert.equal(
    parseWebdavBackupTimestamp(
      "EcoPaste.20260230000000.pc.Windows.full.EcoPaste-backup",
    ),
    undefined,
  );
});
