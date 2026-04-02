import { Flex, Input, InputNumber, List, Select, Switch, Tabs, Tooltip, message } from "antd";
import type { TextAreaRef } from "antd/es/input/TextArea";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSnapshot } from "valtio";
import { open } from "@tauri-apps/plugin-dialog";
import ProList from "@/components/ProList";
import UnoIcon from "@/components/UnoIcon";
import ProListItem from "@/components/ProListItem";
import ProSwitch from "@/components/ProSwitch";
import { WINDOW_LABEL } from "@/constants";
import { CONTENT_TYPE_TAGS } from "@/constants/contentTypes";
import { networkStore, refreshNetworkInfo } from "@/stores/network";
import { transferStore } from "@/stores/transfer";
import { getSaveDatabasePath } from "@/utils/path";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import styles from "./index.module.scss";

interface TransferCredentials {
  bark_url: string;
  bark_key: string;
  webhook_url: string;
  webhook_headers: string;
  receive_token: string;
  tunnel_address: string;
  image_webhook_upload_url: string;
  image_webhook_headers: string;
  image_webhook_public_base: string;
  image_webdav_url: string;
  image_webdav_path: string;
  image_webdav_username: string;
  image_webdav_password: string;
  image_webdav_public_base: string;
  image_local_public_base: string;
}

type PushChannelKey = "bark" | "webhook";
type ImageStrategyValue =
  | "lan_server"
  | "webhook_server"
  | "webdav"
  | "localpath"
  | "reject";

const normalizeExternalBaseUrl = (value: string) => {
  const trimmed = value.trim().replace(/\/+$/, "");

  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `http://${trimmed}`;
};

const IMAGE_STRATEGIES: Array<{
  value: ImageStrategyValue;
  label: string;
  icon: string;
  desc: string;
}> = [
  {
    value: "reject",
    label: "拦截图片推送",
    icon: "i-lucide:shield-alert",
    desc: "推送时将自动过滤图片内容",
  },
  {
    value: "lan_server",
    label: "局域网传输",
    icon: "i-lucide:monitor",
    desc: "极速安全，专属临时通道，仅支持同局域网设备传输",
  },
  {
    value: "webhook_server",
    label: "Webhook 网关",
    icon: "i-lucide:network",
    desc: "推荐，跨网互联，对接 Node-RED 等中转服务",
  },
  {
    value: "webdav",
    label: "WebDAV 传输",
    icon: "i-lucide:upload-cloud",
    desc: "安全稳定，支持上传至私有云、NAS 存储设备",
  },
  {
    value: "localpath",
    label: "本地目录",
    icon: "i-lucide:hard-drive",
    desc: "搭配硬盘映射与局域网同步机制使用",
  },
];

const IMAGE_TTL_OPTIONS = [
  { label: "1 分钟", value: "1" },
  { label: "3 分钟", value: "3" },
  { label: "5 分钟", value: "5" },
  { label: "10 分钟", value: "10" },
  { label: "30 分钟", value: "30" },
  { label: "不销毁", value: "0" },
];

const ttlSecondsToOption = (ttlSeconds: number) => {
  if (ttlSeconds === 0) return "0";

  const exact = IMAGE_TTL_OPTIONS.find((option) => Number(option.value) * 60 === ttlSeconds);
  return exact?.value ?? "3";
};

const ttlOptionToSeconds = (value: string) => {
  if (value === "0") return 0;
  return Number(value) * 60;
};

const Transfer = () => {
  const { t } = useTranslation();
  const { push, receive } = useSnapshot(transferStore);
  const { lanIp } = useSnapshot(networkStore);
  const [messageApi, contextHolder] = message.useMessage();
  const templateRef = useRef<TextAreaRef>(null);

  // 敏感凭据（从 Windows 凭据管理器加载）
  const [credentials, setCredentials] = useState<TransferCredentials>({
    bark_url: "https://api.day.app",
    bark_key: "",
    webhook_url: "",
    webhook_headers: "",
    receive_token: "",
    tunnel_address: "",
    image_webhook_upload_url: "",
    image_webhook_headers: "",
    image_webhook_public_base: "",
    image_webdav_url: "",
    image_webdav_path: "",
    image_webdav_username: "",
    image_webdav_password: "",
    image_webdav_public_base: "",
    image_local_public_base: "",
  });

  // 接收服务状态
  const [receiverStatus, setReceiverStatus] = useState({
    running: false,
    port: 41234,
  });
  const [pendingPort, setPendingPort] = useState(receive.port);
  const [webhookTemplateDraft, setWebhookTemplateDraft] = useState(
    push.webhookPayloadTemplate,
  );

  // 加载凭据
  useEffect(() => {
    invoke<TransferCredentials | null>("plugin:transfer|get_transfer_config").then(
      (config) => {
        if (config) setCredentials(config);
      },
    );
  }, []);

  // 加载接收服务状态
  useEffect(() => {
    invoke<{ running: boolean; port: number }>(
      "plugin:transfer|get_receiver_status",
    ).then(setReceiverStatus);
  }, [receive.masterEnabled]);

  useEffect(() => {
    refreshNetworkInfo().catch(() => {});
  }, []);

  useEffect(() => {
    const ensureReceiverRunning = async () => {
      if (!receive.masterEnabled) return;

      const appWindow = getCurrentWebviewWindow();
      if (appWindow.label !== WINDOW_LABEL.PREFERENCE) return;

      try {
        const status = await refreshReceiverStatus();
        if (status.running) return;

        const dbPath = await getSaveDatabasePath();
        await invoke("plugin:transfer|start_receiver", {
          autoCopy: receive.autoCopy,
          dbPath,
          port: receive.port,
          token: credentials.receive_token,
        });

        await refreshReceiverStatus();
      } catch {
        // 静默兜底，避免初始化时序导致开关开启但服务未启动
      }
    };

    void ensureReceiverRunning();
  }, [credentials.receive_token, receive.masterEnabled, receive.port]);

  useEffect(() => {
    setPendingPort(receive.port);
  }, [receive.port]);

  useEffect(() => {
    const textarea = templateRef.current?.resizableTextArea?.textArea;
    const isEditing = document.activeElement === textarea;

    if (!isEditing && webhookTemplateDraft !== push.webhookPayloadTemplate) {
      setWebhookTemplateDraft(push.webhookPayloadTemplate);
    }
  }, [push.webhookPayloadTemplate, webhookTemplateDraft]);

  // 保存敏感凭据
  const saveCredentials = async (update: Partial<TransferCredentials>) => {
    const newCreds = { ...credentials, ...update };
    setCredentials(newCreds);
    try {
      await invoke("plugin:transfer|set_transfer_config", { config: newCreds });
    } catch (e) {
      messageApi.error(`保存凭据失败: ${e}`);
    }
  };

  const refreshReceiverStatus = async () => {
    const status = await invoke<typeof receiverStatus>(
      "plugin:transfer|get_receiver_status",
    );
    setReceiverStatus(status);

    return status;
  };

  const startReceiverService = async (port: number, successMessage?: string) => {
    const dbPath = await getSaveDatabasePath();
    await invoke("plugin:transfer|start_receiver", {
      autoCopy: transferStore.receive.autoCopy,
      port,
      token: credentials.receive_token,
      dbPath,
    });

    transferStore.receive.port = port;
    transferStore.receive.masterEnabled = true;
    setPendingPort(port);
    messageApi.success(successMessage ?? t("preference.transfer.receive.start_success"));

    return refreshReceiverStatus();
  };

  // 测试推送
  const handleTestPush = async (provider: PushChannelKey) => {
    try {
      const result = await invoke<{ success: boolean; message: string }>(
        "plugin:transfer|test_push",
        {
          config: credentials,
           nonSensitive: {
              providers: [provider],
              service_port: receive.port,
              bark_level: push.barkLevel,
              bark_auto_copy: push.barkAutoCopy,
              bark_archive: push.barkArchive,
              bark_group_mode: push.barkGroupMode,
              bark_group_mapping: push.barkGroupMapping,
              image_strategy: "reject",
              image_ttl_seconds: 180,
              image_local_directory: "",
              webhook_payload_template: push.webhookPayloadTemplate,
            },
          },
      );
      if (result.success) {
        messageApi.success(t("preference.transfer.push.test_success"));
      } else {
        messageApi.error(result.message);
      }
    } catch (e) {
      messageApi.error(`${e}`);
    }
  };

  // 启动/停止接收服务（使用 getSaveDatabasePath 替代 ACL 命令）
  const handleToggleReceiver = async (enabled: boolean) => {
    transferStore.receive.masterEnabled = enabled;

    if (enabled) {
      try {
        await startReceiverService(receive.port);
      } catch (e) {
        messageApi.error(`${e}`);
        transferStore.receive.masterEnabled = false;
      }
    } else {
      transferStore.receive.masterEnabled = false;
      await invoke("plugin:transfer|stop_receiver");
      setReceiverStatus((prev) => ({ ...prev, running: false }));
    }
  };

  const applyPendingPort = async () => {
    if (pendingPort === receive.port) return;

    try {
      if (receive.masterEnabled) {
        await startReceiverService(
          pendingPort,
          t("preference.transfer.receive.port_apply_success", {
            replace: [String(pendingPort)],
          }),
        );
      } else {
        transferStore.receive.port = pendingPort;
        messageApi.success(
          t("preference.transfer.receive.port_saved_success", {
            replace: [String(pendingPort)],
          }),
        );
      }
    } catch (e) {
      messageApi.error(`${e}`);
      const status = await refreshReceiverStatus().catch(() => null);
      transferStore.receive.masterEnabled = status?.running ?? false;
      setPendingPort(receive.port);
    }
  };

  // 计算内网/公网 URL
  const activePort = receiverStatus.running ? receiverStatus.port : receive.port;
  const localUrl = `http://${lanIp}:${activePort}/api/write`;
  const externalBaseUrl = normalizeExternalBaseUrl(credentials.tunnel_address);
  const publicUrl = externalBaseUrl ? `${externalBaseUrl}/api/write` : "";

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    messageApi.success(t("preference.transfer.receive.copied"));
  };

  const handleRefreshLanIp = async () => {
    try {
      const previousLanIp = lanIp;
      const info = await refreshNetworkInfo();

      if (info.lan_ip === previousLanIp) {
        messageApi.info(t("preference.transfer.receive.lan_ip_unchanged"));
        return;
      }

      messageApi.success(
        t("preference.transfer.receive.lan_ip_refresh_success", {
          replace: [info.lan_ip],
        }),
      );
    } catch (e) {
      messageApi.error(`${e}`);
    }
  };

  // 在光标位置插入变量
  const insertTemplateVar = (code: string) => {
    const el = templateRef.current?.resizableTextArea?.textArea;
    if (!el) {
      const nextValue = `${webhookTemplateDraft}${code}`;
      setWebhookTemplateDraft(nextValue);
      transferStore.push.webhookPayloadTemplate = nextValue;
      return;
    }
    const start = el.selectionStart ?? webhookTemplateDraft.length;
    const end = el.selectionEnd ?? start;
    const before = webhookTemplateDraft.slice(0, start);
    const after = webhookTemplateDraft.slice(end);
    const nextValue = before + code + after;
    const nextCursor = start + code.length;

    setWebhookTemplateDraft(nextValue);
    transferStore.push.webhookPayloadTemplate = nextValue;

    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
    });
  };

  // Webhook 模板变量
  const templateVars = [
    { code: "{{剪贴板内容}}", label: t("preference.transfer.push.webhook.var_content") },
    { code: "{{类型标签}}", label: t("preference.transfer.push.webhook.var_type") },
    { code: "{{来源}}", label: t("preference.transfer.push.webhook.var_source") },
    { code: "{{内容长度}}", label: t("preference.transfer.push.webhook.var_length") },
  ];

  // 标签选择/取消
  const toggleTag = (key: string) => {
    const tags = [...transferStore.push.autoPushTags];
    const idx = tags.indexOf(key);
    if (idx >= 0) tags.splice(idx, 1);
    else tags.push(key);
    transferStore.push.autoPushTags = tags;
  };

  const imageTtlOption = ttlSecondsToOption(push.imageTtlSeconds);

  return (
    <>
      {contextHolder}

      <ProList header={t("preference.transfer.basic_title")}>
        <List.Item className={styles.basicConfigListItem}>
          <div className={`${styles.basicConfigContent} w-full`}>
            <ProListItem title={t("preference.transfer.receive.port_label")}>
              <Flex align="center" gap={8}>
                <InputNumber
                  max={65535}
                  min={1024}
                  onChange={(value) => {
                    if (typeof value === "number") {
                      setPendingPort(value);
                    }
                  }}
                  style={{ width: 120 }}
                  value={pendingPort}
                />
                {pendingPort !== receive.port && (
                  <Flex align="center" className={styles.portActions} gap={4}>
                    <Tooltip title={t("preference.transfer.receive.port_confirm")}>
                      <button
                        className={styles.portActionBtn}
                        onClick={applyPendingPort}
                        type="button"
                      >
                        <UnoIcon name="i-lucide:check" />
                      </button>
                    </Tooltip>
                    <Tooltip title={t("preference.transfer.receive.port_cancel")}>
                      <button
                        className={`${styles.portActionBtn} ${styles.portActionBtnDanger}`}
                        onClick={() => setPendingPort(receive.port)}
                        type="button"
                      >
                        <UnoIcon name="i-lucide:x" />
                      </button>
                    </Tooltip>
                  </Flex>
                )}
              </Flex>
            </ProListItem>

            <ProListItem
              description={t("preference.transfer.receive.lan_ip_hint")}
              title={t("preference.transfer.receive.lan_ip_label")}
            >
              <Flex align="center" gap={8}>
                <Input className={styles.readonlyField} readOnly style={{ width: 260 }} value={lanIp} />
                <Tooltip title={t("preference.transfer.receive.refresh_lan_ip")}>
                  <button
                    className={styles.compactIconBtn}
                    onClick={() => void handleRefreshLanIp()}
                    type="button"
                  >
                    <UnoIcon name="i-lucide:refresh-cw" />
                  </button>
                </Tooltip>
              </Flex>
            </ProListItem>

            <ProListItem
              description={t("preference.transfer.receive.tunnel_hint")}
              title={t("preference.transfer.receive.tunnel_label")}
            >
              <Input
                onChange={(e) => saveCredentials({ tunnel_address: e.target.value })}
                placeholder="https://eco.your-domain.com"
                style={{ width: 300 }}
                value={credentials.tunnel_address}
              />
            </ProListItem>
          </div>
        </List.Item>
      </ProList>

      {/* ── 数据互传 功能分组 ─────────────────────────── */}
      <ProList header={t("preference.transfer.group_title")}>
        <List.Item className="p-4! pl-0!">
          <div className="w-full">
            <Tabs
                items={[
                  {
                    key: "push",
                    label: t("preference.transfer.tabs.push"),
                    children: (
                  <>
                    {/* 启用主动推送 */}
          <ProSwitch
            description={t("preference.transfer.push.master_desc")}
            onChange={(value) => {
              transferStore.push.masterEnabled = value;
              if (value) {
                messageApi.success(t("preference.transfer.push.start_success"));
              }
            }}
            title={t("preference.transfer.push.master_title")}
            value={push.masterEnabled}
          />
  
          <div className={push.masterEnabled ? "" : styles.disabled}>
  
            {/* 自动推送 */}
            <ProListItem
              description={t("preference.transfer.push.auto_desc")}
              title={t("preference.transfer.push.auto_title")}
            >
              <Select
                onChange={(value) => {
                  transferStore.push.autoPushMode = value;
                }}
                options={[
                  { label: t("preference.transfer.push.auto_off"), value: "off" },
                  { label: t("preference.transfer.push.auto_favorites"), value: "favorites_only" },
                  { label: t("preference.transfer.push.auto_custom"), value: "custom" },
                ]}
                style={{ width: 160 }}
                value={push.autoPushMode}
              />
            </ProListItem>
  
            {/* 自定义标签筛选（复用备份导出样式） */}
            {push.autoPushMode === "custom" && (
              <div className={styles.tagFilterArea}>
                <Flex align="center" className="mb-3" justify="space-between">
                  <span className="text-color-3 text-xs">
                    {t("preference.transfer.push.auto_custom_hint")}
                  </span>
                  <Flex gap={12}>
                    <button
                      className="b-none cursor-pointer bg-transparent text-primary text-xs transition-opacity hover:opacity-80"
                      onClick={() => {
                        transferStore.push.autoPushTags = CONTENT_TYPE_TAGS.map((tag) => tag.key);
                      }}
                      type="button"
                    >
                      {t("preference.transfer.push.select_all")}
                    </button>
                    <button
                      className="b-none cursor-pointer bg-transparent text-color-3 text-xs transition-colors hover:text-color-2"
                      onClick={() => {
                        transferStore.push.autoPushTags = [];
                      }}
                      type="button"
                    >
                      {t("preference.transfer.push.clear_all")}
                    </button>
                  </Flex>
                </Flex>
                <Flex gap={8} wrap="wrap">
                  {CONTENT_TYPE_TAGS.map((tag) => {
                    const selected = push.autoPushTags.includes(tag.key);
                    return (
                      <button
                        className="b flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all"
                        key={tag.key}
                        onClick={() => toggleTag(tag.key)}
                        style={{
                          background: selected
                            ? "var(--ant-color-bg-container)"
                            : "var(--ant-color-fill-quaternary)",
                          borderColor: selected ? "var(--ant-color-border)" : "transparent",
                          color: selected
                            ? "var(--ant-color-text)"
                            : "var(--ant-color-text-quaternary)",
                        }}
                        type="button"
                      >
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] transition-all"
                          style={{
                            backgroundColor: selected ? `${tag.color}18` : "var(--ant-color-fill-tertiary)",
                            color: selected ? tag.color : "var(--ant-color-text-quaternary)",
                          }}
                        >
                          {tag.icon}
                        </span>
                        <span>{tag.label}</span>
                      </button>
                    );
                  })}
                </Flex>
              </div>
            )}
  
            <div className={styles.channelSection}>
              <div className={styles.channelSectionHeader}>
                <div>
                  <div className={styles.channelSectionTitle}>
                    {t("preference.transfer.push.section_channel")}
                  </div>
                  <div className={styles.channelSectionDesc}>
                    {t("preference.transfer.push.channel_desc")}
                  </div>
                </div>
              </div>

              <div className={styles.channelStack}>
                <div
                  className={`${styles.channelCard} ${
                    push.barkEnabled ? styles.channelCardActive : ""
                  }`}
                >
                  <div className={styles.channelHeader}>
                    <div className={styles.channelHeadMain}>
                      <div
                        className={`${styles.channelIcon} ${
                          push.barkEnabled ? styles.channelIconActive : ""
                        }`}
                      >
                        <UnoIcon name="i-lucide:bell" />
                      </div>
                      <div className={styles.channelMeta}>
                        <div className={styles.channelNameRow}>
                          <span className={styles.channelName}>Bark</span>
                          <span
                            className={`${styles.channelStatus} ${
                              push.barkEnabled
                                ? styles.channelStatusActive
                                : styles.channelStatusInactive
                            }`}
                          >
                            {t(
                              push.barkEnabled
                                ? "preference.transfer.push.channel_enabled"
                                : "preference.transfer.push.channel_disabled",
                            )}
                          </span>
                        </div>
                        <span className={styles.channelDesc}>
                          {t("preference.transfer.push.bark_desc")}
                        </span>
                      </div>
                    </div>

                    <div className={styles.channelActions}>
                      {push.barkEnabled && (
                        <button
                          className={styles.channelTestBtn}
                          onClick={() => void handleTestPush("bark")}
                          type="button"
                        >
                          <UnoIcon name="i-lucide:activity" />
                          <span>{t("preference.transfer.push.test_btn")}</span>
                        </button>
                      )}
                      <Switch
                        checked={push.barkEnabled}
                        onChange={(value) => {
                          transferStore.push.barkEnabled = value;
                        }}
                      />
                    </div>
                  </div>

                  {push.barkEnabled && (
                    <div className={styles.channelBody}>
                      <ProListItem title={t("preference.transfer.push.bark.url_label")}>
                        <Input
                          onChange={(e) => saveCredentials({ bark_url: e.target.value })}
                          placeholder="https://api.day.app"
                          style={{ width: 300 }}
                          value={credentials.bark_url}
                        />
                      </ProListItem>

                      <ProListItem title={t("preference.transfer.push.bark.key_label")}>
                        <Input.Password
                          onChange={(e) => saveCredentials({ bark_key: e.target.value })}
                          placeholder={t("preference.transfer.push.bark.key_placeholder")}
                          style={{ width: 300 }}
                          value={credentials.bark_key}
                        />
                      </ProListItem>

                      <ProSwitch
                        description={t("preference.transfer.push.bark.auto_copy_desc")}
                        onChange={(value) => {
                          transferStore.push.barkAutoCopy = value;
                        }}
                        title={t("preference.transfer.push.bark.auto_copy")}
                        value={push.barkAutoCopy}
                      />

                      <ProSwitch
                        description={t("preference.transfer.push.bark.archive_desc")}
                        onChange={(value) => {
                          transferStore.push.barkArchive = value;
                        }}
                        title={t("preference.transfer.push.bark.archive")}
                        value={push.barkArchive}
                      />

                      <ProListItem
                        description={t("preference.transfer.push.bark.level_desc")}
                        title={t("preference.transfer.push.bark.level")}
                      >
                        <Select
                          onChange={(value) => {
                            transferStore.push.barkLevel = value;
                          }}
                          options={[
                            { label: t("preference.transfer.push.bark.level_active"), value: "active" },
                            {
                              label: t("preference.transfer.push.bark.level_time_sensitive"),
                              value: "timeSensitive",
                            },
                            { label: t("preference.transfer.push.bark.level_passive"), value: "passive" },
                          ]}
                          style={{ width: 160 }}
                          value={push.barkLevel}
                        />
                      </ProListItem>

                      <ProListItem
                        description={t("preference.transfer.push.bark.group_mode_desc")}
                        title={t("preference.transfer.push.bark.group_mode")}
                      >
                        <Select
                          onChange={(value) => {
                            transferStore.push.barkGroupMode = value;
                          }}
                          options={[
                            {
                              label: t("preference.transfer.push.bark.group_disabled"),
                              value: "disabled",
                            },
                            { label: t("preference.transfer.push.bark.group_auto"), value: "auto" },
                            {
                              label: t("preference.transfer.push.bark.group_custom"),
                              value: "custom",
                            },
                          ]}
                          style={{ width: 160 }}
                          value={push.barkGroupMode}
                        />
                      </ProListItem>

                      {/* 极简映射 UI */}
                      {push.barkGroupMode === "custom" && (
                        <div className={styles.mappingGrid}>
                          {CONTENT_TYPE_TAGS.map((tag) => (
                            <div className={styles.mappingRow} key={tag.key}>
                              <span
                                className={styles.mappingIcon}
                                style={{
                                  backgroundColor: `${tag.color}18`,
                                  color: tag.color,
                                }}
                              >
                                {tag.icon}
                              </span>
                              <span className={styles.mappingLabel}>{tag.label}</span>
                              <span className={styles.mappingArrow}>→</span>
                              <input
                                className={styles.mappingInput}
                                onChange={(e) => {
                                  transferStore.push.barkGroupMapping = {
                                    ...transferStore.push.barkGroupMapping,
                                    [tag.key]: e.target.value,
                                  };
                                }}
                                placeholder={tag.label}
                                value={push.barkGroupMapping[tag.key] ?? tag.label}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div
                  className={`${styles.channelCard} ${
                    push.webhookEnabled ? styles.channelCardActive : ""
                  }`}
                >
                  <div className={styles.channelHeader}>
                    <div className={styles.channelHeadMain}>
                      <div
                        className={`${styles.channelIcon} ${
                          push.webhookEnabled ? styles.channelIconActive : ""
                        }`}
                      >
                        <UnoIcon name="i-lucide:globe" />
                      </div>
                      <div className={styles.channelMeta}>
                        <div className={styles.channelNameRow}>
                          <span className={styles.channelName}>Webhook</span>
                          <span
                            className={`${styles.channelStatus} ${
                              push.webhookEnabled
                                ? styles.channelStatusActive
                                : styles.channelStatusInactive
                            }`}
                          >
                            {t(
                              push.webhookEnabled
                                ? "preference.transfer.push.channel_enabled"
                                : "preference.transfer.push.channel_disabled",
                            )}
                          </span>
                        </div>
                        <span className={styles.channelDesc}>
                          {t("preference.transfer.push.webhook_desc")}
                        </span>
                      </div>
                    </div>

                    <div className={styles.channelActions}>
                      {push.webhookEnabled && (
                        <button
                          className={styles.channelTestBtn}
                          onClick={() => void handleTestPush("webhook")}
                          type="button"
                        >
                          <UnoIcon name="i-lucide:activity" />
                          <span>{t("preference.transfer.push.test_btn")}</span>
                        </button>
                      )}
                      <Switch
                        checked={push.webhookEnabled}
                        onChange={(value) => {
                          transferStore.push.webhookEnabled = value;
                        }}
                      />
                    </div>
                  </div>

                  {push.webhookEnabled && (
                    <div className={styles.channelBody}>
                      <ProListItem title={t("preference.transfer.push.webhook.url_label")}>
                        <Input
                          onChange={(e) => saveCredentials({ webhook_url: e.target.value })}
                          placeholder="http://192.168.x.x:1880/webhook"
                          style={{ width: 300 }}
                          value={credentials.webhook_url}
                        />
                      </ProListItem>

                      <div className={styles.webhookHeaderSection}>
                        <div className={styles.webhookHeaderTitle}>
                          {t("preference.transfer.push.webhook.headers_label")}
                          <span className={styles.webhookHeaderHint}>
                            {t("preference.transfer.push.webhook.headers_hint")}
                          </span>
                        </div>
                        <Input.TextArea
                          onChange={(e) => saveCredentials({ webhook_headers: e.target.value })}
                          placeholder={'{\n  "Authorization": "Bearer YOUR_TOKEN"\n}'}
                          autoSize={{ minRows: 2, maxRows: 8 }}
                          style={{ width: "100%" }}
                          value={credentials.webhook_headers}
                        />
                      </div>

                      {/* Payload 模板 */}
                      <div className={styles.templateSection}>
                        <div className={styles.templateHeader}>
                          <span>{t("preference.transfer.push.webhook.template_label")}</span>
                          <Flex gap={6} wrap="wrap" style={{ marginTop: 4 }}>
                            <span className="text-color-3 text-xs">
                              {t("preference.transfer.push.webhook.vars_label")}
                            </span>
                            {templateVars.map((v) => (
                              <button
                                className={styles.varBtn}
                                key={v.code}
                                onClick={() => insertTemplateVar(v.code)}
                                type="button"
                              >
                                + {v.label}
                              </button>
                            ))}
                          </Flex>
                        </div>
                        <Input.TextArea
                          ref={templateRef}
                          onChange={(e) => {
                            const nextValue = e.target.value;
                            setWebhookTemplateDraft(nextValue);
                            transferStore.push.webhookPayloadTemplate = nextValue;
                          }}
                          autoSize={{ minRows: 5, maxRows: 12 }}
                          style={{ resize: "none" }}
                          value={webhookTemplateDraft}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.channelSection}>
                  <div className={styles.imageStrategySectionHeader}>
                    <div>
                      <div className={styles.imageStrategySectionTitle}>
                        <span>{t("preference.transfer.push.image.section_title", "图片中转策略")}</span>
                      </div>
                      <div className={styles.imageStrategySectionDesc}>
                        {t(
                          "preference.transfer.push.image.section_desc",
                          "APNs 存在体积限制，图片需转为直链推送供终端下载。请选择最适合的中转方式。",
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={styles.imageStrategyStack}>
                    {IMAGE_STRATEGIES.map((strategy) => {
                      const isActive = push.imageStrategy === strategy.value;

                      return (
                        <div
                          className={`${styles.imageStrategyCard} ${
                            isActive ? styles.imageStrategyCardActive : ""
                          }`}
                          key={strategy.value}
                        >
                          <button
                            className={`${styles.imageStrategyHeader} ${
                              isActive ? styles.imageStrategyHeaderActive : ""
                            }`}
                            onClick={() => {
                              transferStore.push.imageStrategy = strategy.value;
                            }}
                            type="button"
                          >
                            <div className={styles.imageStrategyHeadMain}>
                              <div
                                className={`${styles.imageStrategyIcon} ${
                                  isActive ? styles.imageStrategyIconActive : ""
                                }`}
                              >
                                <UnoIcon name={strategy.icon} />
                              </div>
                              <div className={styles.imageStrategyMeta}>
                                <div className={styles.imageStrategyNameRow}>
                                  <span className={styles.imageStrategyName}>{strategy.label}</span>
                                  <span
                                    className={`${styles.imageStrategyStatus} ${
                                      isActive
                                        ? styles.imageStrategyStatusActive
                                        : styles.imageStrategyStatusInactive
                                    }`}
                                  >
                                    {isActive ? "已启用" : "未启用"}
                                  </span>
                                </div>
                                <span className={styles.imageStrategyDesc}>{strategy.desc}</span>
                              </div>
                            </div>

                            <span
                              className={`${styles.imageStrategyRadio} ${
                                isActive ? styles.imageStrategyRadioActive : ""
                              }`}
                            >
                              {isActive && <span className={styles.imageStrategyRadioDot} />}
                            </span>
                          </button>

                          <div
                            className={`${styles.imageStrategyBody} ${
                              isActive ? styles.imageStrategyBodyActive : ""
                            }`}
                          >
                            {strategy.value === "lan_server" && (
                              <div className={styles.imageStrategyForm}>
                                <div className={styles.imageFormRow}>
                                  <div className={styles.imageFormMeta}>
                                    <span className={styles.imageFormTitle}>自动销毁时间</span>
                                    <span className={styles.imageFormDesc}>
                                      生成临时下载链接后的存活时间，超时后链接将失效
                                    </span>
                                  </div>
                                  <Select
                                    onChange={(value) => {
                                      transferStore.push.imageTtlSeconds = ttlOptionToSeconds(value);
                                    }}
                                    options={IMAGE_TTL_OPTIONS}
                                    popupMatchSelectWidth={false}
                                    style={{ width: 132 }}
                                    value={imageTtlOption}
                                  />
                                </div>

                                <div className={styles.imageInfoPanel}>
                                  <div className={styles.imageInfoPanelMain}>
                                    <UnoIcon
                                      className={styles.imageInfoIcon}
                                      color="var(--ant-color-primary)"
                                      name="i-lucide:info"
                                    />
                                    <div className={styles.imageInfoContent}>
                                      <p className={styles.imageInfoText}>
                                        Ecopaste 会在本地 %TEMP%/ecopaste 目录生成私密下载链接。
                                        {imageTtlOption === "0" ? (
                                          <span>
                                            当前设置为
                                            <strong> 永不销毁 </strong>
                                            ，长时间推送可能占用较多存储空间，建议定期清理缓存。
                                          </span>
                                        ) : (
                                          <span>
                                            为保障安全，该链接在推送
                                            <strong> {imageTtlOption} 分钟后自动失效 </strong>。
                                          </span>
                                        )}
                                      </p>
                                      {credentials.tunnel_address.trim() && (
                                        <p className={styles.imageInfoNote}>
                                          <UnoIcon name="i-lucide:check-circle-2" />
                                          <span>
                                            已检测到公网访问地址，将尝试通过该地址暴露图片链接。
                                          </span>
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {strategy.value === "webhook_server" && (
                              <div className={styles.imageStrategyForm}>
                                <div className={styles.imageFieldGroup}>
                                  <span className={styles.imageFieldTitle}>1. 图片上传接口</span>
                                  <span className={styles.imageFieldHint}>将图片 POST 到网关</span>
                                </div>
                                <Input
                                  onChange={(e) =>
                                    saveCredentials({ image_webhook_upload_url: e.target.value })
                                  }
                                  placeholder="例如: http://192.168.x.x:1880/eco/upload_img"
                                  prefix={<UnoIcon name="i-lucide:upload-cloud" />}
                                  value={credentials.image_webhook_upload_url}
                                />

                                <div className={styles.imageFieldBlock}>
                                  <span className={styles.imageFieldTitle}>鉴权 Headers (可选)</span>
                                  <Input
                                    onChange={(e) =>
                                      saveCredentials({ image_webhook_headers: e.target.value })
                                    }
                                    placeholder='{"Authorization": "Bearer XXX"}'
                                    value={credentials.image_webhook_headers}
                                  />
                                </div>

                                <div className={styles.imageWarnPanel}>
                                  <div className={styles.imageWarnHeader}>
                                    <span className={styles.imageWarnTitle}>
                                      <UnoIcon name="i-lucide:shield-alert" />
                                      2. 公开 Web 直链前缀
                                    </span>
                                    <span className={styles.imageWarnTag}>必填，用于终端下载</span>
                                  </div>
                                  <Input
                                    onChange={(e) =>
                                      saveCredentials({ image_webhook_public_base: e.target.value })
                                    }
                                    placeholder="例如: https://your-frp.domain.com/eco/img/"
                                    prefix={<UnoIcon name="i-lucide:link" />}
                                    value={credentials.image_webhook_public_base}
                                  />
                                  <p className={styles.imageWarnText}>
                                    请确保网关已开启图片免密读取权限，系统将拼接
                                    <strong>「此前缀 + 文件名」</strong>
                                    生成直链推送至手机。
                                  </p>
                                </div>
                              </div>
                            )}

                            {strategy.value === "webdav" && (
                              <div className={styles.imageStrategyForm}>
                                <div className={styles.imageFieldBlock}>
                                  <div className={styles.imageFieldGroup}>
                                    <span className={styles.imageFieldTitle}>1. WebDAV 服务器地址</span>
                                    <span className={styles.imageFieldHint}>IPv6 地址需加 []</span>
                                  </div>
                                  <Input
                                    onChange={(e) =>
                                      saveCredentials({ image_webdav_url: e.target.value })
                                    }
                                    placeholder="例如: https://[240e:xxx]:5006"
                                    value={credentials.image_webdav_url}
                                  />
                                </div>

                                <div className={styles.imageFieldBlock}>
                                  <span className={styles.imageFieldTitle}>2. 路径</span>
                                  <Input
                                    onChange={(e) =>
                                      saveCredentials({ image_webdav_path: e.target.value })
                                    }
                                    placeholder="例如: /EcoPaste/"
                                    value={credentials.image_webdav_path}
                                  />
                                </div>

                                <div className={styles.imageFieldBlock}>
                                  <span className={styles.imageFieldTitle}>3. 账号 (Username)</span>
                                  <Input
                                    onChange={(e) =>
                                      saveCredentials({ image_webdav_username: e.target.value })
                                    }
                                    value={credentials.image_webdav_username}
                                  />
                                </div>

                                <div className={styles.imageFieldBlock}>
                                  <span className={styles.imageFieldTitle}>4. 密码 (Password)</span>
                                  <Input.Password
                                    onChange={(e) =>
                                      saveCredentials({ image_webdav_password: e.target.value })
                                    }
                                    value={credentials.image_webdav_password}
                                  />
                                </div>

                                <div className={styles.imageWarnPanel}>
                                  <div className={styles.imageWarnHeader}>
                                    <span className={styles.imageWarnTitle}>
                                      <UnoIcon name="i-lucide:shield-alert" />
                                      5. 公开 Web 直链前缀
                                    </span>
                                    <span className={styles.imageWarnTag}>必填，用于终端下载</span>
                                  </div>
                                  <Input
                                    onChange={(e) =>
                                      saveCredentials({ image_webdav_public_base: e.target.value })
                                    }
                                    placeholder="例如: https://nas.ipv6-domain.com/eco_public/"
                                    prefix={<UnoIcon name="i-lucide:link" />}
                                    value={credentials.image_webdav_public_base}
                                  />
                                  <p className={styles.imageWarnText}>
                                    由于手机端不支持 WebDAV 明文密码，请配置免密的 HTTP 访问路径，系统将拼接
                                    <strong>「此前缀 + 文件名」</strong>
                                    生成直链推送至手机。
                                  </p>
                                </div>
                              </div>
                            )}

                            {strategy.value === "localpath" && (
                              <div className={styles.imageStrategyForm}>
                                <div className={styles.imageFieldBlock}>
                                  <div className={styles.imageFieldGroup}>
                                    <span className={styles.imageFieldTitle}>1. 本地写入目录</span>
                                    <span className={styles.imageFieldHint}>支持 NAS 映射盘符</span>
                                  </div>
                                  <div className={styles.imageFieldInline}>
                                    <Input
                                      onChange={(e) => {
                                        transferStore.push.imageLocalDirectory = e.target.value;
                                      }}
                                      placeholder={"例如: Z:\\Ecopaste_Images\\"}
                                      value={push.imageLocalDirectory}
                                    />
                                    <button
                                      className={styles.imageBrowseBtn}
                                      onClick={async () => {
                                        const selected = await open({
                                          defaultPath: push.imageLocalDirectory || undefined,
                                          directory: true,
                                        });

                                        if (typeof selected === "string") {
                                          transferStore.push.imageLocalDirectory = selected;
                                        }
                                      }}
                                      type="button"
                                    >
                                      浏览...
                                    </button>
                                  </div>
                                </div>

                                <div className={styles.imageWarnPanel}>
                                  <div className={styles.imageWarnHeader}>
                                    <span className={styles.imageWarnTitle}>
                                      <UnoIcon name="i-lucide:shield-alert" />
                                      2. 公开 Web 直链前缀
                                    </span>
                                    <span className={styles.imageWarnTag}>必填，用于终端下载</span>
                                  </div>
                                  <Input
                                    onChange={(e) =>
                                      saveCredentials({ image_local_public_base: e.target.value })
                                    }
                                    placeholder="例如: https://nas.ipv6-domain.com/eco_public/"
                                    prefix={<UnoIcon name="i-lucide:link" />}
                                    value={credentials.image_local_public_base}
                                  />
                                  <p className={styles.imageWarnText}>
                                    请通过 Nginx 等工具为该目录配置免密访问，系统将拼接
                                    <strong>「此前缀 + 文件名」</strong>
                                    生成直链推送至手机。
                                  </p>
                                </div>
                              </div>
                            )}

                            {strategy.value === "reject" && (
                              <div className={styles.imageRejectPanel}>
                                <UnoIcon className={styles.imageRejectIcon} name="i-lucide:shield-alert" />
                                <p className={styles.imageRejectText}>
                                  已启用拦截策略：系统将不再推送图片内容。
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
                </div>
              </>
            )
          },
                  {
                    key: "receive",
                    label: t("preference.transfer.tabs.receive"),
                    children: (
                  <>
                    <ProSwitch
            description={t("preference.transfer.receive.master_desc")}
            onChange={handleToggleReceiver}
            title={t("preference.transfer.receive.master_title")}
            value={receive.masterEnabled}
          />
  
          <div className={receive.masterEnabled ? "" : styles.disabled}>
            <ProListItem title={t("preference.transfer.receive.token_label")}>
              <Input.Password
                onChange={(e) => saveCredentials({ receive_token: e.target.value })}
                placeholder={t("preference.transfer.receive.token_placeholder")}
                style={{ width: 300 }}
                value={credentials.receive_token}
              />
            </ProListItem>
  
            <ProSwitch
              description={t("preference.transfer.receive.auto_copy_desc")}
              onChange={async (value) => {
                transferStore.receive.autoCopy = value;
                if (!receive.masterEnabled) return;

                try {
                  const dbPath = await getSaveDatabasePath();
                  await invoke("plugin:transfer|start_receiver", {
                    autoCopy: value,
                    port: receive.port,
                    token: credentials.receive_token,
                    dbPath,
                  });
                } catch (e) {
                  messageApi.error(`${e}`);
                }
              }}
              title={t("preference.transfer.receive.auto_copy")}
              value={receive.autoCopy}
            />
  
            {/* 发送端 POST 地址 */}
            {receive.masterEnabled && receiverStatus.running && (
              <div className={styles.cardContainer}>
                <div className={styles.apiCard}>
                  <div className={styles.apiCardHeader}>
                    <div className={styles.apiCardTitle}>
                      <UnoIcon className={styles.apiCardTitleIcon} name="i-lucide:file-code-2" />
                      <span>{t("preference.transfer.receive.card_title")}</span>
                    </div>
                    <div className={styles.apiCardStatus}>
                      <span className={styles.apiCardStatusDot} />
                      <span>{t("preference.transfer.receive.status_listening")}</span>
                    </div>
                  </div>

                  <div className={styles.apiCardBody}>
                    <div className={styles.apiRow}>
                      <div className={styles.apiRowMain}>
                        <span className={styles.apiMethodTag}>POST</span>
                        <div className={styles.apiTextBlock}>
                          <span className={styles.apiRowLabel}>
                            {t("preference.transfer.receive.url_local_access")}
                          </span>
                          <code className={styles.apiUrl}>{localUrl}</code>
                        </div>
                      </div>
                      <Tooltip title={t("preference.transfer.receive.copy_url")}>
                        <button
                          className={styles.apiCopyBtn}
                          onClick={() => void copyUrl(localUrl)}
                          type="button"
                        >
                          <UnoIcon name="i-lucide:copy" />
                        </button>
                      </Tooltip>
                    </div>

                    <div className={styles.apiRow}>
                      <div className={styles.apiRowMain}>
                        <span
                          className={publicUrl ? styles.apiMethodTag : styles.apiMethodTagDisabled}
                        >
                          POST
                        </span>
                        <div className={styles.apiTextBlock}>
                          <span className={styles.apiRowLabel}>
                            {t("preference.transfer.receive.url_public_access")}
                          </span>
                          {publicUrl ? (
                            <code className={styles.apiUrl}>{publicUrl}</code>
                          ) : (
                            <span className={styles.apiUrlEmpty}>
                              <UnoIcon name="i-lucide:info" />
                              {t("preference.transfer.receive.not_configured_public")}
                            </span>
                          )}
                        </div>
                      </div>
                      <Tooltip title={t("preference.transfer.receive.copy_url")}>
                        <button
                          className={publicUrl ? styles.apiCopyBtn : styles.apiCopyBtnDisabled}
                          disabled={!publicUrl}
                          onClick={() => {
                            if (!publicUrl) return;
                            void copyUrl(publicUrl);
                          }}
                          type="button"
                        >
                          <UnoIcon name="i-lucide:copy" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
                )
              }
            ]}
          />
          </div>
        </List.Item>
      </ProList>
    </>
  );
};

export default Transfer;
