import { useMount, useReactive } from "ahooks";
import {
  Button,
  Checkbox,
  Flex,
  Input,
  Modal,
  message,
  Select,
  Space,
  Table,
  Tooltip,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import clsx from "clsx";
import { filesize } from "filesize";
import { type Key, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSnapshot } from "valtio";
import ProList from "@/components/ProList";
import ProListItem from "@/components/ProListItem";
import UnoIcon from "@/components/UnoIcon";
import {
  cancelWebdavUpload,
  deleteWebdavBackup,
  getWebdavComputerName,
  getWebdavConfig,
  setWebdavConfig,
  testWebdavConfig,
} from "@/plugins/webdav";
import { clipboardStore } from "@/stores/clipboard";
import type { AutoBackupStrategy } from "@/types/store";
import { formatDate } from "@/utils/dayjs";
import {
  backupToWebdav,
  getDefaultWebdavFilename,
  listWebdavBackupFiles,
  normalizeWebdavBackupFileName,
  restoreWebdavBackup,
} from "@/utils/webdavBackup";
import type { State } from "../..";
import ScheduleConfigComponent from "./ScheduleConfig";

interface WebdavFormState {
  address: string;
  username: string;
  password: string;
  path: string;
}

interface BackupRow {
  fileName: string;
  size?: number;
  modified?: string;
}

const MAX_BACKUPS_OPTIONS = [
  { label: "无限制", value: 0 },
  { label: "1", value: 1 },
  { label: "3", value: 3 },
  { label: "5", value: 5 },
  { label: "10", value: 10 },
  { label: "20", value: 20 },
  { label: "50", value: 50 },
];

const Webdav = (props: { state: State }) => {
  const { state } = props;
  const { t } = useTranslation();
  const { webdav } = useSnapshot(clipboardStore);
  const [backupOpen, setBackupOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [backupName, setBackupName] = useState("");
  const [computerName, setComputerName] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState<boolean>();

  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const form = useReactive<WebdavFormState>({
    address: "",
    password: "",
    path: "",
    username: "",
  });

  useMount(async () => {
    const config = await getWebdavConfig();
    if (config) {
      form.address = config.address;
      form.username = config.username;
      form.password = config.password;
      form.path = config.path;
    }
    try {
      setBackupName(
        await getDefaultWebdavFilename(
          undefined,
          clipboardStore.webdav.manualLite,
        ),
      );
    } catch (error: any) {
      message.error(String(error));
    }
  });

  const saveConfig = async () => {
    try {
      await setWebdavConfig({
        address: form.address,
        password: form.password,
        path: form.path,
        username: form.username,
      });
    } catch (error: any) {
      message.error(String(error));
    }
  };

  const handleTest = async () => {
    if (testing) return;
    try {
      setTesting(true);
      setTestSuccess(undefined);
      await saveConfig();
      const start = Date.now();
      await testWebdavConfig({
        address: form.address,
        password: form.password,
        path: form.path,
        username: form.username,
      });
      const duration = Date.now() - start;
      setTestSuccess(true);
      message.success(
        `${t("preference.data_backup.webdav.hints.test_success")} (延迟: ${duration}ms)`,
      );
      setTimeout(() => setTestSuccess(undefined), 3000);
    } catch (error: any) {
      setTestSuccess(false);
      message.error(
        t("preference.data_backup.webdav.hints.test_failed", {
          error: String(error),
        }),
      );
      setTimeout(() => setTestSuccess(undefined), 3000);
    } finally {
      setTesting(false);
    }
  };

  const openBackupModal = async () => {
    setBackupOpen(true);
    try {
      const name = await getWebdavComputerName();
      setComputerName(name);
      setBackupName(
        await getDefaultWebdavFilename(name, clipboardStore.webdav.manualLite),
      );
    } catch (error: any) {
      message.error(String(error));
      try {
        setBackupName(
          await getDefaultWebdavFilename(
            computerName,
            clipboardStore.webdav.manualLite,
          ),
        );
      } catch (innerError: any) {
        message.error(String(innerError));
      }
    }
  };

  const updateStatus = (
    status: "success" | "error",
    error?: string,
    mode?: "full" | "lite",
  ) => {
    clipboardStore.webdav.lastBackupStatus = status;
    clipboardStore.webdav.lastBackupAt = formatDate();
    clipboardStore.webdav.lastBackupError = error;
    if (mode) clipboardStore.webdav.lastBackupMode = mode;
  };

  const handleBackupConfirm = async () => {
    let name = backupName.trim();
    if (!name) return;
    // Inject mode marker if not already present
    if (!name.includes(".lite") && !name.includes(".full")) {
      name = `${name}.${webdav.manualLite ? "lite" : "full"}`;
    }
    const fileName = normalizeWebdavBackupFileName(name);

    try {
      setUploading(true);
      await saveConfig();
      await backupToWebdav(
        fileName,
        webdav.manualLite,
        clipboardStore.webdav.maxBackups,
      );
      updateStatus("success", undefined, webdav.manualLite ? "lite" : "full");
      message.success(t("preference.data_backup.webdav.hints.backup_success"));
      setBackupOpen(false);
    } catch (error: any) {
      updateStatus("error", String(error));
      message.error(String(error));
    } finally {
      setUploading(false);
    }
  };

  const handleBackupCancel = async () => {
    if (uploading) {
      await cancelWebdavUpload();
      setUploading(false);
    }
    setBackupOpen(false);
  };

  const loadBackups = async () => {
    try {
      setLoading(true);
      await saveConfig();
      const list = await listWebdavBackupFiles();
      const sorted = list
        .map((item) => ({
          ...item,
          timeValue:
            parseTimeValue(item.fileName) ||
            (item.modified ? Date.parse(item.modified) : 0),
        }))
        .sort((a, b) => b.timeValue - a.timeValue);
      setBackups(sorted);
      setSelectedKeys([]);
    } catch (error: any) {
      message.error(String(error));
    } finally {
      setLoading(false);
    }
  };

  const openRestoreModal = async () => {
    setRestoreOpen(true);
    await loadBackups();
  };

  const confirmRestore = async () => {
    return await new Promise<boolean>((resolve) => {
      Modal.confirm({
        cancelText: t("preference.data_backup.webdav.button.cancel_restore"),
        centered: true,
        content: t("preference.data_backup.webdav.hints.confirm_restore"),
        okText: t("preference.data_backup.webdav.button.confirm_restore"),
        onCancel: () => resolve(false),
        onOk: () => resolve(true),
      });
    });
  };

  const handleRestore = async (fileName: string) => {
    try {
      const confirmed = await confirmRestore();
      if (!confirmed) return;
      setRestoreOpen(false);
      state.spinning = true;
      await restoreWebdavBackup(fileName);
      message.success(t("preference.data_backup.webdav.hints.restore_success"));
    } catch (error: any) {
      message.error(String(error));
    } finally {
      state.spinning = false;
    }
  };

  const handleDelete = async (fileName: string) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        cancelText: t("preference.data_backup.webdav.button.cancel_restore"),
        centered: true,
        content: t("preference.data_backup.webdav.hints.confirm_delete"),
        okButtonProps: { danger: true },
        okText: t("preference.data_backup.webdav.button.delete"),
        onCancel: () => resolve(false),
        onOk: () => resolve(true),
      });
    });
    if (!confirmed) return;
    try {
      await deleteWebdavBackup(fileName);
      message.success(t("preference.data_backup.webdav.hints.delete_success"));
      await loadBackups();
    } catch (error: any) {
      message.error(String(error));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedKeys.length === 0) return;
    const confirmed = await new Promise<boolean>((resolve) => {
      Modal.confirm({
        cancelText: t("preference.data_backup.webdav.button.cancel_restore"),
        centered: true,
        content: t(
          "preference.data_backup.webdav.hints.confirm_delete_selected",
          {
            total: selectedKeys.length,
          },
        ),
        okButtonProps: { danger: true },
        okText: t("preference.data_backup.webdav.button.delete"),
        onCancel: () => resolve(false),
        onOk: () => resolve(true),
      });
    });
    if (!confirmed) return;
    try {
      setLoading(true);
      await Promise.all(
        selectedKeys.map((name) => deleteWebdavBackup(String(name))),
      );
      message.success(t("preference.data_backup.webdav.hints.delete_success"));
      await loadBackups();
    } catch (error: any) {
      message.error(String(error));
    } finally {
      setLoading(false);
    }
  };

  const parseTimeValue = (fileName: string) => {
    const parts = fileName.split(".");
    const timestamp = parts[1];
    if (!timestamp || timestamp.length !== 14) return void 0;
    return Number(timestamp);
  };

  const parseTimeLabel = (fileName: string, fallback?: string) => {
    const parts = fileName.split(".");
    const timestamp = parts[1];
    if (!timestamp || timestamp.length !== 14) return fallback || "-";
    return `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)} ${timestamp.slice(8, 10)}:${timestamp.slice(10, 12)}:${timestamp.slice(12, 14)}`;
  };

  const parseDevice = (fileName: string) => {
    const parts = fileName.split(".");
    return parts[2] || "-";
  };

  const columns: ColumnsType<BackupRow> = [
    {
      dataIndex: "fileName",
      onHeaderCell: () => ({ className: "text-center" }),
      render: (value: string) => {
        return (
          <Space size={8}>
            <Button
              onClick={() => handleRestore(value)}
              size="small"
              type="link"
            >
              {t("preference.data_backup.webdav.button.restore")}
            </Button>
            <Button
              danger
              onClick={() => handleDelete(value)}
              size="small"
              type="link"
            >
              {t("preference.data_backup.webdav.button.delete")}
            </Button>
          </Space>
        );
      },
      title: t("preference.data_backup.webdav.table.action"),
    },
    {
      dataIndex: "fileName",
      ellipsis: true,
      onHeaderCell: () => ({ className: "text-center" }),
      render: (value: string) => value,
      title: t("preference.data_backup.webdav.table.name"),
    },
    {
      dataIndex: "fileName",
      onHeaderCell: () => ({ className: "text-center" }),
      render: (value: string, record) => parseTimeLabel(value, record.modified),
      title: t("preference.data_backup.webdav.table.time"),
    },
    {
      dataIndex: "fileName",
      onHeaderCell: () => ({ className: "text-center" }),
      render: (value: string) => {
        const parts = value.split(".");
        // Mode is at parts[4]: 'lite' or 'full' (format: AppName.TIMESTAMP.DEVICE.OS.MODE.ext)
        const mode = parts[4];
        if (mode === "lite")
          return t("preference.data_backup.webdav.table.mode_lite", "轻量");
        if (mode === "full")
          return t("preference.data_backup.webdav.table.mode_full", "完整");
        return "-";
      },
      title: t("preference.data_backup.webdav.table.mode", "模式"),
    },
    {
      dataIndex: "size",
      onHeaderCell: () => ({ className: "text-center" }),
      render: (value?: number) => (value ? filesize(value) : "-"),
      title: t("preference.data_backup.webdav.table.size"),
    },
    {
      dataIndex: "fileName",
      onHeaderCell: () => ({ className: "text-center" }),
      render: (value: string) => parseDevice(value),
      title: t("preference.data_backup.webdav.table.device"),
    },
  ];

  const status = webdav.lastBackupStatus;
  const backupMode = webdav.lastBackupMode;
  const statusText =
    status === "success"
      ? backupMode === "lite"
        ? t("preference.data_backup.webdav.status.lite_success", "轻量备份成功")
        : t("preference.data_backup.webdav.status.full_success", "完整备份成功")
      : status === "error"
        ? t("preference.data_backup.webdav.status.failed")
        : t("preference.data_backup.webdav.status.never");
  const statusTime = webdav.lastBackupAt;
  const showStatusTime = status === "success" || status === "error";
  const statusError = webdav.lastBackupError;
  const statusIcon =
    status === "success"
      ? "i-lucide:check-circle-2"
      : status === "error"
        ? "i-lucide:triangle-alert"
        : "i-lucide:minus-circle";
  const statusColor =
    status === "success"
      ? "text-green-6"
      : status === "error"
        ? "text-red-6"
        : "text-color-3";

  const testLabel = t("preference.data_backup.webdav.button.test").replace(
    /\s+/g,
    "",
  );

  return (
    <>
      <ProList header={t("preference.data_backup.webdav.section_title")}>
        <ProListItem title={t("preference.data_backup.webdav.label.address")}>
          <Input
            onBlur={saveConfig}
            onChange={(event) => {
              form.address = event.target.value;
            }}
            onPressEnter={saveConfig}
            placeholder={t("preference.data_backup.webdav.placeholder.address")}
            style={{ width: 300 }}
            value={form.address}
          />
        </ProListItem>

        <ProListItem title={t("preference.data_backup.webdav.label.username")}>
          <Input
            onBlur={saveConfig}
            onChange={(event) => {
              form.username = event.target.value;
            }}
            onPressEnter={saveConfig}
            placeholder={t(
              "preference.data_backup.webdav.placeholder.username",
            )}
            style={{ width: 300 }}
            value={form.username}
          />
        </ProListItem>

        <ProListItem title={t("preference.data_backup.webdav.label.password")}>
          <div className="webdav-password">
            <Input.Password
              addonAfter={
                <div
                  className={clsx(
                    "webdav-test flex h-[30px] min-w-[72px] cursor-pointer select-none items-center justify-center px-3 transition-colors",
                    {
                      "text-green-6": testSuccess === true,
                      "text-red-6": testSuccess === false,
                    },
                  )}
                  onClick={handleTest}
                >
                  {testing ? (
                    <Flex align="center" gap={4}>
                      <UnoIcon
                        className="animate-spin"
                        name="i-lucide:loader-2"
                      />
                      {t(
                        "preference.data_backup.webdav.button.testing",
                        "正在测试...",
                      )}
                    </Flex>
                  ) : testSuccess === true ? (
                    <Flex align="center" gap={4}>
                      <UnoIcon name="i-lucide:check" />
                      {t(
                        "preference.data_backup.webdav.button.test_success_short",
                        "连接成功",
                      )}
                    </Flex>
                  ) : testSuccess === false ? (
                    <Flex align="center" gap={4}>
                      <UnoIcon name="i-lucide:x" />
                      {t(
                        "preference.data_backup.webdav.button.test_failed_short",
                        "连接失败",
                      )}
                    </Flex>
                  ) : (
                    testLabel
                  )}
                </div>
              }
              onBlur={saveConfig}
              onChange={(event) => {
                form.password = event.target.value;
              }}
              onPressEnter={saveConfig}
              placeholder={t(
                "preference.data_backup.webdav.placeholder.password",
              )}
              style={{ width: 300 }}
              value={form.password}
            />
          </div>
        </ProListItem>

        <ProListItem title={t("preference.data_backup.webdav.label.path")}>
          <Input
            onBlur={saveConfig}
            onChange={(event) => {
              form.path = event.target.value;
            }}
            onPressEnter={saveConfig}
            placeholder={t("preference.data_backup.webdav.placeholder.path")}
            style={{ width: 300 }}
            value={form.path}
          />
        </ProListItem>

        <ProListItem
          description={t("preference.data_backup.webdav.hints.manual")}
          title={t("preference.data_backup.webdav.label.manual")}
        >
          <Space>
            <Button onClick={openBackupModal}>
              💾 {t("preference.data_backup.webdav.button.backup")}
            </Button>
            <Button onClick={openRestoreModal}>
              📥 {t("preference.data_backup.webdav.button.restore_from")}
            </Button>
          </Space>
        </ProListItem>

        <ProListItem
          description={t(
            "preference.data_backup.webdav.hints.auto_strategy",
            "设置 WebDAV 自动备份启用状态和备份模式",
          )}
          title={t(
            "preference.data_backup.webdav.label.auto_strategy",
            "自动备份策略",
          )}
        >
          <Select
            onChange={(value: AutoBackupStrategy) => {
              clipboardStore.webdav.autoStrategy = value;
            }}
            options={[
              {
                label: t("preference.data_backup.webdav.strategy.off", "关闭"),
                value: "off",
              },
              {
                label: t(
                  "preference.data_backup.webdav.strategy.full",
                  "完整备份",
                ),
                value: "full",
              },
              {
                label: t(
                  "preference.data_backup.webdav.strategy.lite",
                  "轻量备份",
                ),
                value: "lite",
              },
              {
                label: t(
                  "preference.data_backup.webdav.strategy.combined",
                  "组合备份",
                ),
                value: "combined",
              },
            ]}
            style={{ width: 120 }}
            value={webdav.autoStrategy}
          />
        </ProListItem>

        {(webdav.autoStrategy === "full" || webdav.autoStrategy === "lite") && (
          <ScheduleConfigComponent
            description={t(
              "preference.data_backup.webdav.hints.schedule",
              "设置 WebDAV 自动备份的时间",
            )}
            onChange={(patch) => {
              const key =
                webdav.autoStrategy === "full"
                  ? "fullSchedule"
                  : "liteSchedule";
              Object.assign(clipboardStore.webdav[key], patch);
            }}
            title={t(
              "preference.data_backup.webdav.label.schedule",
              "备份周期",
            )}
            value={
              webdav.autoStrategy === "full"
                ? webdav.fullSchedule
                : webdav.liteSchedule
            }
          />
        )}

        {webdav.autoStrategy === "combined" && (
          <>
            <ScheduleConfigComponent
              description={t(
                "preference.data_backup.webdav.hints.full_schedule",
                "设置 WebDAV 自动完整备份的时间",
              )}
              onChange={(patch) => {
                Object.assign(clipboardStore.webdav.fullSchedule, patch);
              }}
              title={t(
                "preference.data_backup.webdav.label.full_schedule",
                "完整备份周期",
              )}
              value={webdav.fullSchedule}
            />
            <ScheduleConfigComponent
              description={t(
                "preference.data_backup.webdav.hints.lite_schedule",
                "设置 WebDAV 自动轻量备份的时间",
              )}
              onChange={(patch) => {
                Object.assign(clipboardStore.webdav.liteSchedule, patch);
              }}
              title={t(
                "preference.data_backup.webdav.label.lite_schedule",
                "轻量备份周期",
              )}
              value={webdav.liteSchedule}
            />
          </>
        )}

        <ProListItem
          description={t("preference.data_backup.webdav.hints.max_backups")}
          title={t("preference.data_backup.webdav.label.max_backups")}
        >
          <Select
            onChange={(value) => {
              clipboardStore.webdav.maxBackups = value;
            }}
            options={MAX_BACKUPS_OPTIONS}
            style={{ width: 120 }}
            value={webdav.maxBackups}
          />
        </ProListItem>

        <ProListItem title={t("preference.data_backup.webdav.label.status")}>
          <Flex align="center" gap={8}>
            <UnoIcon className={statusColor} name={statusIcon} />
            <span className={statusColor}>
              {statusText}
              {showStatusTime && statusTime ? ` ${statusTime}` : ""}
            </span>
            {status === "error" && statusError && (
              <Tooltip
                title={t("preference.data_backup.webdav.hints.error", {
                  error: statusError,
                })}
              >
                <UnoIcon className="text-red-6" name="i-lucide:info" />
              </Tooltip>
            )}
          </Flex>
        </ProListItem>
      </ProList>

      <Modal
        closable
        maskClosable
        okButtonProps={{ loading: uploading }}
        okText={t("preference.data_backup.webdav.button.confirm_backup")}
        onCancel={handleBackupCancel}
        onOk={handleBackupConfirm}
        open={backupOpen}
        title={t("preference.data_backup.webdav.title.backup")}
      >
        <Space className="w-full" direction="vertical" size={12}>
          <Space className="w-full" direction="vertical" size={8}>
            <span className="text-color-2 text-xs">
              {t("preference.data_backup.webdav.label.filename")}
            </span>
            <Input
              onChange={(event) => setBackupName(event.target.value)}
              placeholder={t(
                "preference.data_backup.webdav.placeholder.filename",
              )}
              value={backupName}
            />
          </Space>
          <Tooltip
            title={t(
              "preference.data_backup.webdav.hints.lite",
              "备份时跳过图片和文件(夹)类型的内容，仅保留文本等其他内容与设置以提升速度",
            )}
          >
            <Checkbox
              checked={webdav.manualLite}
              onChange={async (e) => {
                clipboardStore.webdav.manualLite = e.target.checked;
                // Regenerate filename with updated mode marker
                try {
                  setBackupName(
                    await getDefaultWebdavFilename(
                      computerName,
                      e.target.checked,
                    ),
                  );
                } catch {}
              }}
            >
              {t("preference.data_backup.webdav.label.lite", "轻量备份")}
            </Checkbox>
          </Tooltip>
        </Space>
      </Modal>

      <Modal
        closable
        footer={
          <Flex align="center" justify="space-between">
            <Flex align="center" gap={8}>
              <Button loading={loading} onClick={loadBackups}>
                {t("preference.data_backup.webdav.button.refresh")}
              </Button>
              <span className="text-color-2 text-xs">
                {t("preference.data_backup.webdav.label.total", {
                  total: backups.length,
                })}
              </span>
            </Flex>
            <Space>
              <Button
                danger
                disabled={selectedKeys.length === 0}
                onClick={handleDeleteSelected}
              >
                {t("preference.data_backup.webdav.button.delete_selected", {
                  total: selectedKeys.length,
                })}
              </Button>
              <Button onClick={() => setRestoreOpen(false)}>
                {t("preference.data_backup.webdav.button.close")}
              </Button>
            </Space>
          </Flex>
        }
        maskClosable
        onCancel={() => setRestoreOpen(false)}
        open={restoreOpen}
        title={t("preference.data_backup.webdav.title.restore")}
        width={960}
      >
        <Table
          columns={columns}
          dataSource={backups}
          loading={loading}
          pagination={{ pageSize: 10, size: "small" }}
          rowKey="fileName"
          rowSelection={{
            onChange: (keys) => setSelectedKeys(keys),
            selectedRowKeys: selectedKeys,
          }}
          scroll={{ y: 360 }}
          size="small"
          tableLayout="auto"
        />
      </Modal>
    </>
  );
};

export default Webdav;
