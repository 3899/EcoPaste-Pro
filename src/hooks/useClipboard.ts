import { invoke } from "@tauri-apps/api/core";
import { useMount } from "ahooks";
import { cloneDeep } from "es-toolkit";
import { isEmpty, remove } from "es-toolkit/compat";
import { nanoid } from "nanoid";
import {
  type ClipboardChangeOptions,
  onClipboardChange,
  startListening,
} from "tauri-plugin-clipboard-x-api";
import { fullName } from "tauri-plugin-fs-pro-api";
import {
  insertHistory,
  selectHistory,
  updateHistory,
} from "@/database/history";
import type { State } from "@/pages/Main";
import { getClipboardTextSubtype } from "@/plugins/clipboard";
import { clipboardStore } from "@/stores/clipboard";
import type { DatabaseSchemaHistory } from "@/types/database";
import { formatDate } from "@/utils/dayjs";
import { consumeTransferEchoFingerprint } from "@/utils/transferFingerprint";
import { buildTransferPushItem } from "@/utils/transferPushItem";

export const useClipboard = (
  state: State,
  options?: ClipboardChangeOptions,
) => {
  useMount(async () => {
    await startListening();

    let isProcessing = false;
    let lastClipboardSequenceNumber = 0;

    onClipboardChange(async (result) => {
      if (isProcessing) return;
      isProcessing = true;

      try {
        try {
          const currentSeq = await invoke<number>(
            "get_clipboard_sequence_number",
          );
          // 返回 0 说明是跨平台兜底或者获取失败，不走序列号拦截逻辑
          if (currentSeq !== 0 && currentSeq === lastClipboardSequenceNumber) {
            return;
          }
          lastClipboardSequenceNumber = currentSeq;
        } catch {}

        const { files, image, html, rtf, text } = result;

        if (isEmpty(result) || Object.values(result).every(isEmpty)) return;

        const { copyPlain } = clipboardStore.content;

        const data = {
          createTime: formatDate(),
          favorite: false,
          group: "text",
          id: nanoid(),
          search: text?.value,
        } as DatabaseSchemaHistory;

        let sourceAppName = "";
        if (clipboardStore.content.recordSourceApp) {
          try {
            const appInfo: any = await invoke("get_source_app_info");
            if (appInfo?.appName) {
              sourceAppName = appInfo.appName;
              data.sourceAppName = appInfo.appName;
              if (appInfo.appIcon) {
                data.sourceAppIcon = appInfo.appIcon;
              }
            }
          } catch {}
        }

        let effectiveImage = image;

        /**
         * 判定策略：底层"识别是什么"与上层"如何利用"完全解耦，同时拥有 image + html 时，根据多个特征区分表格 vs 网页图片
         * - 1. 来源程序 `sourceAppName` 是真正的专属表格办公软件（一票否决权，百分百定性）
         * - 2. 存在 `rtf` 格式：因为浏览器单纯复制图片时，不会同时存在 rtf 数据
         * - 3. html 内容中含有 `<table>` 标签，单纯的网页图片复制只会有一层 <img> 标签
         * - 4. html 内部出现 Excel 或 WPS 独有的 `xmlns:x` 命名空间或 `class="xl... / et..."` 的表格专属类名
         */
        const isSpreadsheetWithImage =
          effectiveImage &&
          html &&
          (/(excel\.exe|excel|wps\.exe|et\.exe)/i.test(sourceAppName) ||
            rtf ||
            /<table[\s>]/i.test(html.value) ||
            /xmlns:x="urn:schemas-microsoft-com/i.test(html.value) ||
            /class="(xl\d+|et\d+)/i.test(html.value));

        if (isSpreadsheetWithImage) {
          // 如果已定性为表格，择清理 readImage() 产生的孤儿图片文件，避免磁盘塞满垃圾，此处直接删掉。
          if (effectiveImage?.value) {
            try {
              const { remove: removeFile, exists: fileExists } = await import(
                "@tauri-apps/plugin-fs"
              );
              if (await fileExists(effectiveImage.value)) {
                await removeFile(effectiveImage.value);
              }
            } catch {}
          }
          // 降维打击：“复制为纯文本”开关打开之后，抹除图片属性，从而平滑地跌入下方 html 和 text 的判断分支中，完美解耦。
          effectiveImage = undefined;
        }

        if (files) {
          // 如果文件都是图片且有图片数据，优先识别为图片（如截图工具）
          const imageExtensions =
            /\.(png|jpg|jpeg|gif|bmp|webp|svg|ico|tiff?|avif)$/i;
          const allFilesAreImages =
            files.value.length > 0 &&
            files.value.every((f: string) => imageExtensions.test(f));

          if (allFilesAreImages && effectiveImage) {
            Object.assign(data, effectiveImage, {
              group: "image",
            });
          } else {
            Object.assign(data, files, {
              group: "files",
              search: files.value.join(" "),
            });
          }
        } else if (effectiveImage) {
          Object.assign(data, effectiveImage, {
            group: "image",
          });
        } else if (html && !copyPlain) {
          html.value = html.value.trim();
          Object.assign(data, html);
        } else if (rtf && !copyPlain) {
          Object.assign(data, rtf);
        } else if (text) {
          const trimmedTextValue = text.value.trim();
          const subtype = await getClipboardTextSubtype(trimmedTextValue);

          Object.assign(data, text, {
            subtype,
          });

          if (subtype && ["url", "email", "path", "color"].includes(subtype)) {
            data.value = trimmedTextValue;
            data.search = trimmedTextValue;
          }
        }

        // 后置检查：若被分类为 html 但纯文本匹配 Windows 路径/指令/代码模式，则覆盖为 text
        if (data.type === "html" && text) {
          const trimmedText = text.value
            .replace(/[\u00A0\u200B\uFEFF]/g, " ")
            .trim();
          let rescuedAsText = false;

          if (!trimmedText.includes("\n")) {
            const { isURL, isEmail, isWin } = await import("@/utils/is");

            if (isURL(trimmedText) || isEmail(trimmedText)) {
              rescuedAsText = true;
            } else if (isWin) {
              const { isWinPathOrCommand } = await import("@/utils/winPaths");
              if (isWinPathOrCommand(trimmedText)) {
                rescuedAsText = true;
              }
            }
          }

          // 尝试代码检测 (救回从IDE复制的带高亮的HTML代码块)
          if (!rescuedAsText) {
            const { detectCode } = await import("@/utils/isCode");
            const codeDetect = detectCode(trimmedText);
            if (codeDetect.isCode && codeDetect.language) {
              rescuedAsText = true;
              // 稍后统一赋值，这里只需要知道可以被拯救
            }
          }

          if (rescuedAsText) {
            const subtype = await getClipboardTextSubtype(trimmedText);
            Object.assign(data, text, {
              html: undefined,
              search: trimmedText,
              subtype,
              type: "text",
              value: trimmedText,
            });
          }
        }

        const sqlData = cloneDeep(data);

        const { type, value, group, createTime } = data;

        if (consumeTransferEchoFingerprint(type, value)) {
          return;
        }

        if (type === "image") {
          const fileName = await fullName(value);

          try {
            const { getDefaultSaveImagePath } = await import(
              "tauri-plugin-clipboard-x-api"
            );
            const { getSaveImagePath, join } = await import("@/utils/path");
            const { copyFile, exists, remove, mkdir } = await import(
              "@tauri-apps/plugin-fs"
            );

            const defaultSavePath = await getDefaultSaveImagePath();
            const customSavePath = getSaveImagePath();

            if (defaultSavePath !== customSavePath) {
              const originalFilePath = join(defaultSavePath, fileName);
              const customFilePath = join(customSavePath, fileName);

              if (await exists(originalFilePath)) {
                if (!(await exists(customSavePath))) {
                  await mkdir(customSavePath, { recursive: true });
                }
                await copyFile(originalFilePath, customFilePath);
                await remove(originalFilePath);
                data.value = customFilePath;
              }
            }
          } catch {}

          sqlData.value = fileName;
        }

        if (type === "files") {
          sqlData.value = JSON.stringify(value);
        }

        const [matched] = await selectHistory((qb) => {
          const { type, value } = sqlData;

          return qb.where("type", "=", type).where("value", "=", value);
        });

        let visible = state.group === "all" || state.group === group;

        if (!visible) {
          if (state.group === "favorite" && data.favorite) visible = true;
          if (
            state.group === "links" &&
            (sqlData.subtype === "url" || sqlData.subtype === "path")
          )
            visible = true;
          if (state.group === "colors" && sqlData.subtype === "color")
            visible = true;
          if (state.group === "email" && sqlData.subtype === "email")
            visible = true;
          if (state.group === "code" && sqlData.subtype?.startsWith("code_"))
            visible = true;
        }

        if (matched) {
          if (!clipboardStore.content.autoSort) return;

          const { id } = matched;

          if (visible) {
            remove(state.list, { id });

            const isInternalPasting =
              (window as any).__isEcoPastePasting || false;

            // 外部真实复制：用最新来源覆盖；内部粘贴回声：保留原有来源
            state.list.unshift({
              ...data,
              id,
              sourceAppIcon: isInternalPasting
                ? matched.sourceAppIcon
                : (data.sourceAppIcon ?? matched.sourceAppIcon),
              sourceAppName: isInternalPasting
                ? matched.sourceAppName
                : (data.sourceAppName ?? matched.sourceAppName),
            });
          }

          const isInternalPastingForDb =
            (window as any).__isEcoPastePasting || false;

          return updateHistory(id, {
            createTime,
            sourceAppIcon: isInternalPastingForDb
              ? matched.sourceAppIcon
              : data.sourceAppIcon,
            sourceAppName: isInternalPastingForDb
              ? matched.sourceAppName
              : data.sourceAppName,
            subtype: sqlData.subtype,
          });
        }

        // 内部粘贴回声拦截（仅对未匹配项，如图片因文件名重生导致无法 matched）
        // 短期标记：拦截所有类型的即时回声；长期标记：拦截图片的延迟回声（插件异步处理可能会延迟数秒）
        if (
          (window as any).__isEcoPastePasting ||
          (type === "image" && (window as any).__isEcoPasteImageEcho)
        ) {
          // 清理插件在底层已保存到磁盘的孤儿图片文件（插件先保存文件，再触发事件给我们）
          if (type === "image" && data.value) {
            try {
              const { remove: removeFile, exists: fileExists } = await import(
                "@tauri-apps/plugin-fs"
              );
              if (await fileExists(data.value)) {
                await removeFile(data.value);
              }
            } catch {}
          }
          return;
        }

        if (visible) {
          state.list.unshift(data);
        }

        // 精确记录 EcoPaste 因保存这条记录而实际消耗的存储空间
        if (data.type === "image") {
          // 图片是唯一真正落盘到本地目录的类型，取底层插件算好的物理字节大小
          sqlData.value_size = data.count || 0;
        } else {
          // 其余类型（含 files 路径 JSON）只有文本存入了数据库，用 Blob 精确计算 UTF-8 字节
          sqlData.value_size =
            typeof sqlData.value === "string"
              ? new Blob([sqlData.value]).size
              : 0;
        }
        insertHistory(sqlData);

        // ── 自动推送逻辑（fire-and-forget，不阻塞剪贴板流水线） ──
        try {
          const { transferStore } = await import("@/stores/transfer");
          const { masterEnabled, autoPushMode, autoPushTags } =
            transferStore.push;

          if (masterEnabled && autoPushMode !== "off") {
            const shouldPush = (() => {
              if (autoPushMode === "favorites_only") {
                return false;
              }
              // custom: 根据标签筛选
              const effectiveTag =
                sqlData.subtype || sqlData.type || "text";
              return autoPushTags.includes(effectiveTag);
            })();

            if (shouldPush) {
              const creds = await invoke(
                "plugin:transfer|get_transfer_config",
              );
              if (creds) {
                const providers = [
                  transferStore.push.barkEnabled ? "bark" : null,
                  transferStore.push.webhookEnabled ? "webhook" : null,
                ].filter(Boolean);

                if (providers.length === 0) {
                  return;
                }

                invoke("plugin:transfer|push_clipboard_item", {
                  item: buildTransferPushItem(sqlData, {
                    localPath:
                      sqlData.type === "image" && typeof data.value === "string"
                        ? data.value
                        : null,
                    displayName:
                      sqlData.type === "image" && typeof sqlData.value === "string"
                        ? sqlData.value
                        : null,
                  }),
                  config: creds,
                  nonSensitive: {
                    providers,
                    service_port: transferStore.receive.port,
                    bark_level: transferStore.push.barkLevel,
                    bark_auto_copy: transferStore.push.barkAutoCopy,
                    bark_archive: transferStore.push.barkArchive,
                    bark_group_mode: transferStore.push.barkGroupMode,
                    bark_group_mapping:
                      transferStore.push.barkGroupMapping,
                    image_strategy: transferStore.push.imageStrategy,
                    image_ttl_seconds: transferStore.push.imageTtlSeconds,
                    image_local_directory: transferStore.push.imageLocalDirectory,
                    webhook_payload_template:
                      transferStore.push.webhookPayloadTemplate,
                  },
                }).catch(() => {});
              }
            }
          }
        } catch {
          // 自动推送不应影响主流程
        }
      } finally {
        isProcessing = false;
      }
    }, options);
  });
};
